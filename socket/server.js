const io = require("socket.io")(4000);

let users = [];


io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("")
})