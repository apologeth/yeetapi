# Strax Api

## Setup

- Run `npm install` to install all depedencies for this project.
- Create `.env` file and copy values from `.env.example` to `.env`.
- If you don't install postgres on your local you can run `npm run start:db`. However, If you already install postgres please update database variables in `.env`.
- Run `npm run migrate` to initiate database structure.
- Run `npm run start:smtp` to start SMTP client and server in your local. So, you can use it to receive shamir secret key.
- Run `npm start`, now Strax API must be run on `localhost:3000`. You can ask the team for the postman collection.
