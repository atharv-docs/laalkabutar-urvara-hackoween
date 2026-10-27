"use client";

/**
 * App-wide state: the active repository, the loaded Urvara state, the signed-in
 * session, and a `run` helper that applies a domain-service mutation, persists
 * it, and reports success or failure.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { UrvaraState, User } from "@/types";
import { createRepository, EmptyDatabaseError, type DataRepository, type LoadScope } from "@/repositories";
import { getFirebase, isFirebaseConfigured, loginIdToEmail } from "@/lib/firebase";
import { hashCredential } from "@/lib/credentials";
import { assessUnscoredReports } from "@/services/risk";
import { markFirstLogin } from "@/services/farmers";
import { Toaster, type ToastInput, type ToastItem } from "@/components/ui/Toaster";

type Status = "loading" | "ready" | "empty" | "error";

interface Session {
  userId: string;
}

interface RunOptions {
  success?: string;
  /** Offer an Undo action that restores the state before this change. */
  undoable?: boolean;
}

interface UrvaraContextValue {
  state: UrvaraState | null;
  status: Status;
  error: string | null;
  repo: DataRepository;
  session: Session | null;
  sessionReady: boolean;
  user: User | null;
  run: (mutate: (state: UrvaraState) => UrvaraState, opts?: RunOptions) => Promise<boolean>;
  reset: () => Promise<void>;
  reload: () => void;
  signInAs: (userId: string) => Promise<void>;
  signInWithCredential: (loginId: string, secret: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  toast: (t: ToastInput) => void;
}

const UrvaraContext = createContext<UrvaraContextValue | null>(null);
const SESSION_KEY = "urvara:session";

export function UrvaraProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => createRepository(), []);
  const [state, setState] = useState<UrvaraState | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [scope, setScope] = useState<LoadScope | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const stateRef = useRef<UrvaraState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const toast = useCallback((t: ToastInput) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.action ? 9000 : 5000);
  }, []);

  // Session restore. Demo mode keeps the chosen account in localStorage; live mode follows Firebase Auth.
  useEffect(() => {
    if (repo.source === "demo") {
      try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        // Read after hydration on purpose: the server cannot see localStorage, so a lazy initialiser would mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (raw) setSession(JSON.parse(raw) as Session);
      } catch {
        /* ignore unreadable storage */
      }
      setSessionReady(true);
      return;
    }
    let cancelled = false;
    let unsub: (() => void) | undefined;
    (async () => {
      const { auth, db } = getFirebase();
      const { onAuthStateChanged } = await import("firebase/auth");
      const { doc, getDoc } = await import("firebase/firestore");
      unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (cancelled) return;
        if (!fbUser) {
          setSession(null);
          setScope(null);
          setSessionReady(true);
          return;
        }
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        const profile = snap.exists() ? (snap.data() as User) : null;
        if (!profile) {
          setError("Signed in, but no Urvara profile exists for this account. Ask the owner to create it.");
          setStatus("error");
          setSessionReady(true);
          return;
        }
        setSession({ userId: fbUser.uid });
        setScope({ role: profile.role, userId: fbUser.uid, farmIds: profile.farmIds, fieldIds: profile.fieldIds });
        setSessionReady(true);
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [repo]);

  // Data load + live subscription.
  useEffect(() => {
    if (repo.source === "live" && !scope) return;
    let active = true;
    repo
      .load(scope)
      .then((loaded) => {
        if (!active) return;
        setState(loaded);
        setStatus("ready");
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof EmptyDatabaseError) setStatus("empty");
        else setStatus("error");
        setError(e instanceof Error ? e.message : "Could not load farm data.");
      });
    const unsubscribe = repo.subscribe(scope, (next) => active && setState(next));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repo, scope, sessionReady, reloadKey]);

  const user = useMemo(() => (state && session ? state.users.find((u) => u.id === session.userId) ?? null : null), [state, session]);

  const run = useCallback<UrvaraContextValue["run"]>(
    async (mutate, opts = {}) => {
      const prev = stateRef.current;
      if (!prev) return false;
      let next: UrvaraState;
      try {
        next = mutate(prev);
      } catch (e) {
        toast({ tone: "error", title: "That didn't work", body: e instanceof Error ? e.message : "Unexpected error." });
        return false;
      }
      if (next === prev) return true;
      setState(next);
      stateRef.current = next;
      try {
        await repo.save(prev, next);
      } catch (e) {
        setState(prev);
        stateRef.current = prev;
        toast({ tone: "error", title: "Not saved", body: `${e instanceof Error ? e.message : "The change could not be saved"}. Your previous data is unchanged; try again.` });
        return false;
      }
      if (opts.success) {
        toast({
          tone: "success",
          title: opts.success,
          action: opts.undoable
            ? {
                label: "Undo",
                onClick: async () => {
                  const current = stateRef.current;
                  if (!current) return;
                  setState(prev);
                  stateRef.current = prev;
                  await repo.save(current, prev);
                  toast({ tone: "info", title: "Change undone" });
                },
              }
            : undefined,
        });
      }
      return true;
    },
    [repo, toast],
  );

  // Crop-risk module: the owner session scores any new problem report against every farm.
  useEffect(() => {
    if (!state || user?.role !== "owner") return;
    if (state.reports.some((r) => r.kind === "problem" && !r.riskAssessedAt && r.status !== "dismissed")) {
      // Reacting to reports that arrived from farmer sessions (another tab or Firestore); idempotent.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void run(assessUnscoredReports);
    }
  }, [state, user, run]);

  const reset = useCallback(async () => {
    try {
      const seeded = await repo.reset();
      setState(seeded);
      setStatus("ready");
      toast({ tone: "success", title: "Demo reset", body: "All farms, tasks and scores are back to the starting scenario." });
    } catch (e) {
      toast({ tone: "error", title: "Reset failed", body: e instanceof Error ? e.message : "Try again." });
    }
  }, [repo, toast]);

  const signInAs = useCallback(async (userId: string) => {
    const next = { userId };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const signInWithCredential = useCallback<UrvaraContextValue["signInWithCredential"]>(
    async (loginId, secret) => {
      if (repo.source === "live") {
        try {
          const { getFirebase: fb } = await import("@/lib/firebase");
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          await signInWithEmailAndPassword(fb().auth, loginIdToEmail(loginId), secret);
          return { ok: true };
        } catch {
          return { ok: false, message: "Login ID or password is not correct." };
        }
      }
      const current = stateRef.current;
      const candidate = current?.users.find((u) => u.loginId.toLowerCase() === loginId.trim().toLowerCase());
      if (!candidate) return { ok: false, message: "No account with that login ID. Check the ID card from the owner." };
      if (candidate.status === "deactivated") return { ok: false, message: "This account has been deactivated. Contact the farm owner." };
      if (!candidate.credentialHash) return { ok: false, message: "This seeded demo account has no code. Use the account buttons above." };
      if ((await hashCredential(candidate.loginId, secret)) !== candidate.credentialHash) {
        return { ok: false, message: "That code is not correct. Codes look like ABCD-EFGH." };
      }
      await run((s) => markFirstLogin(s, candidate.id));
      await signInAs(candidate.id);
      return { ok: true };
    },
    [repo, run, signInAs],
  );

  const signOut = useCallback(async () => {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    if (repo.source === "live" && isFirebaseConfigured()) {
      const { signOut: fbSignOut } = await import("firebase/auth");
      await fbSignOut(getFirebase().auth);
    }
  }, [repo]);

  // Live mode before sign-in has nothing to load; that is a ready (signed-out) state, not loading.
  const effectiveStatus: Status = repo.source === "live" && !scope && sessionReady && status === "loading" ? "ready" : status;

  const value: UrvaraContextValue = {
    state,
    status: effectiveStatus,
    error,
    repo,
    session,
    sessionReady,
    user,
    run,
    reset,
    reload: () => {
      setStatus("loading");
      setReloadKey((k) => k + 1);
    },
    signInAs,
    signInWithCredential,
    signOut,
    toast,
  };

  return (
    <UrvaraContext.Provider value={value}>
      {children}
      <Toaster items={toasts} onDismiss={(id) => setToasts((list) => list.filter((t) => t.id !== id))} />
    </UrvaraContext.Provider>
  );
}

export function useUrvara(): UrvaraContextValue {
  const ctx = useContext(UrvaraContext);
  if (!ctx) throw new Error("useUrvara must be used inside UrvaraProvider");
  return ctx;
}

/** For portal pages: state is guaranteed once the portal shell has rendered children. */
export function useReadyState(): { state: UrvaraState; user: User } & Omit<UrvaraContextValue, "state" | "user"> {
  const ctx = useUrvara();
  if (!ctx.state || !ctx.user) throw new Error("Portal content rendered before data was ready");
  return { ...ctx, state: ctx.state, user: ctx.user };
}
