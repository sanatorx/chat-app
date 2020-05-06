const http = require('http');
const path = require('path');

const express = require('express');
const Filter = require('bad-words');
const socketio = require('socket.io');

const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

const server = http.createServer(app);

const io = socketio(server);

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
    console.log('New webSocket connection');


    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options });

        if (error) return callback(error);

        socket.join(user.room);

        socket.emit(`message`, generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit(`message`, generateMessage(user.username, `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
        callback();
    });

    socket.on(`sendMessage`, (message, callback) => {
        const filter = new Filter();
        const user = getUser(socket.id);

        if (filter.isProfane(message)) return callback('Profanity is not allowed!');

        io.to(user.room).emit(`message`, generateMessage(user.username, message));
        callback();
    });

    socket.on('sendLocation', ({ latitude, longitude }, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${latitude},${longitude}`));
        callback(`Location shared!`);
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit(`message`, generateMessage('Admin', `${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        };
    });
});

server.listen(port, () => {
    console.log(`Server is on port ${port}`);
});