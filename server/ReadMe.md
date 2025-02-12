# SETUP
To generate secret keys you can run the following commands

```
node
require('crypto').randomBytes(64).toString('hex')
```

## In your .env
```
ACCESS_TOKEN_SECRET=<paste result here>
REFRESH_TOKEN_SECRET=<run again and paste result here>
DATABASE_URI=mongodb+srv://<servername>:<password>@cluster0.vdgsu.mongodb.net/<databasename>?retryWrites=true&w=majority&appName=<clutername>
```