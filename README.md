# accounter-agent-

#  Milestone 1: Domain Contracts and Runtime Zod schemas
* initialized typescript inside the folder.
* created a directory structure for the contracts.
* put in the contents of all the contracts files.
* ran into a problem with the contracts while testing, it was displaying a huge error log of various contracts having duplicate functions and the index.ts was also showing an error.
* changed adversarial, payments and inverntory in the src/contracts/ folder.
* index.ts is now a non-errornaeous file.
* ran checks on the whole system and all passed 
![Milestone 1 verification]("images\Screenshot 2026-11-04 110454.png")
* included DOM in tsconfig as well to make the console command compatible

# Milestone 2: Core Execution Engines
* created engine directory and updated package.json to fit the version 2 test
* implemented taint-parser.ts, inventory-calculus.ts, policy-engine.ts, autonomy-engine.ts, index.ts
* created the verification file scripts/verify-milestone-2.ts
* run compilation and ran into errors associated with line 9 of package.json
* fixed and re-run, now everything compiles smoothly
* checked each file and came to know there are errors associated with the autonomy-engine.ts
* fixed by converting this type from commonjs to a module
![Milestone 2 verification]("images\Screenshot 2026-11-04 131711.png")

# Milestone 3: PayPal Sandbox Integration
* added src/paypal/: client.ts, orders.ts, payouts.ts, undo-window.ts, webhook-listener.ts, index.ts
* credentials come from PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET these are env variables, no hardcoding
* created scripts/verify-milestone-3.ts and the verify:m3 npm script (all HTTP mocked, runs offline)
* still to test against the real sandbox: buyer approval step, void behaviour, Payouts availability, webhook event names

