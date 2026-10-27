# Urvara demo credentials

Synthetic demo accounts only. These work in demo mode out of the box, and in live mode after `npm run seed:firestore`. Passwords are case-sensitive. The source of truth is [src/data/demoAccounts.ts](src/data/demoAccounts.ts).

## Farmer Portal (`/login`)

| Farmer | Login ID | Password | Village | Language |
| --- | --- | --- | --- | --- |
| Ramesh Pawar | `URV-F-0001` | `Ramesh@1001` | Dindori | Hindi |
| Sunita Jadhav | `URV-F-0002` | `Sunita@1002` | Mohadi | Hindi |
| Vikas Shinde | `URV-F-0003` | `Vikas@1003` | Niphad | English |
| Lakshmi Gaikwad | `URV-F-0004` | `Lakshmi@1004` | Pimpalgaon | Hindi |
| Arjun More | `URV-F-0005` | `Arjun@1005` | Mohadi | English |
| Kavita Deshmukh | `URV-F-0006` | `Kavita@1006` | Sinnar | Hindi |
| Sanjay Bhosale | `URV-F-0007` | `Sanjay@1007` | Sinnar | English |
| Pooja Kale | `URV-F-0008` | `Pooja@1008` | Igatpuri | Hindi |

## Owner Portal (`/login/owner`, via the link under the farmer sign-in box)

| Owner | Login ID | Password |
| --- | --- | --- |
| Anjali Deshpande | `URV-O-0001` | `Anjali@2026` |

Farmers added later in **Owner → Farmers** sign in on `/login` with their login ID and the one-time code shown when they were created.
