## install on local machine from github package registry.

For these steps.

* step 1: register npm server for @kelpglobal by adding a entry in .npmrc of your home directory.
This could be done from cli by following command
```bash
echo @kelpglobal:registry=https://npm.pkg.github.com >> ~/.npmrc
```

* Step 2: Generate a user token from github as specified [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token). We need permissions to read  GitHub Package Registry.Use the kelp github account. This token must be used as password in the next step.

* Step 3: add your git access to npm. use the following command.
Note: Use your kelp git account and password generated above when asked.
```bash
npm login --scope=@kelpglobal --registry=https://npm.pkg.github.com
```

* Step 4: install the pg-migrations globally.

```bash
npm i -g @kelpglobal/postgres-migrations
```




