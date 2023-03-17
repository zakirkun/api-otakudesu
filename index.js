const express = require('express');
const cors = require('cors');
const app = express();
const route = require("./src/router/route")
const { inject } = require("@vercel/analytics")

inject();

app.use(cors());
app.use(route)
const port = process.env.port || 8000;

app.listen(port, () => {
    try {
        console.log(`Running on localhost:${port}`);
    } catch (error) {
        throw error;
    }
}); 