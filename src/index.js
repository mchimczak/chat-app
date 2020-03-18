const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const express = require('express')
const Filter = require('bad-words')
const { generateMessage, generateLocation } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()

//socketio uses the raw server call which is why we needed to refactor the code
//express creates http.createserver behind the scene so we cant use it
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

const publicDirPath = path.join(__dirname, '../public')
app.use(express.static(publicDirPath))


io.on('connection', (socket) => {
    console.log('New web socket connection')

    socket.on('join', (userProps, callback) => {
        const { error, user } = addUser({ id: socket.id, ...userProps})
        
        if (error) {
            return callback(error)
        }

        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', `${user.username}, Welcome to my chat app`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username}, has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })
    socket.on('sendFile', (file) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('fileFunc', [file, generateMessage(user.username, 'admin')])
    })
    socket.on('takePhoto', urlData => {
        const user = getUser(socket.id)
        io.to(user.room).emit('displayPhoto', [urlData, generateMessage(user.username, 'admin') ])
    })
    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)
        msg = msg.trim()
        const filter = new Filter()

        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed')
        }
        if(!msg) {
            return callback('Cannot send empty messages')
        }

        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback('Delivered')
    })
    socket.on('typingMessage', (msg) => {
        const user = getUser(socket.id)
        socket.broadcast.to(user.room).emit('userTyping', generateMessage(user.username, msg))
    })
    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocation(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })
    socket.on('logout', () => {
        const user = removeUser(socket.id)
        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username}, has left the lobby`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })


    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username}, has left the lobby`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
});

server.listen(port, () => console.log(`Server running on port ${port}`))


//io.on('connection') is use on every user that connected
//socket.on('disconnect') is use inside io.on('connection')

//io.emit is use on every connected user

//socket.emit is used on every connected user
//socket.broadcast.emit is used on every user EXCEPT the one that has connected

//io.to(room).emit -> emits events only for sockets inside that room
//socket.broadcast.to(room).emit -> emits events only for sockets inside that "room" EXCEPT the one that logged in