const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    ssl: process.env.EMAIL_SSL,
    tls: process.env.EMAIL_TLS,
    auth: {
      user: process.env.EMAILAUTH_USER,
      pass: process.env.EMAIL_PASS,
    }
});


module.exports = transporter;
