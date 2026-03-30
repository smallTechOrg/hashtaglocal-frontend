# #local Frontend Mobile

## Purpose
Mobile app for #local.


## Get started

### Install dependencies
```bash
npm install
```
### Setup Instructions
To run expo start on your local do expo login first.
```bash
npx expo login
```

###  Start the app
```bash
npx expo start
```

To use remotely, when not on same network:
```bash
npx expo start --tunnel
```


###  Run Backend

Create .env file.
And insert this:
`EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8080`

Replace the IP with the output you get when you run `npx expo start`:
Example:
› Metro waiting on exp://192.168.1.6:8081

`EXPO_PUBLIC_API_BASE_URL=http://192.168.1.6:8080`

Re-start the app after you've made this change.


## Config Setup

Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to the .env file. Get it from a team member.
   


