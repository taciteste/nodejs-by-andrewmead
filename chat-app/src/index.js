const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

// server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment

let count = 0;

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }
        
        socket.join(user.room)

        socket.emit('message', generateMessage("Welcome!"))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`))

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        console.log("New message received.")

        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Message was not delivered! Profanity is not allowed!')
        }

        io.to('test').emit('message', generateMessage(message))
        callback()
    })

    socket.on('sendLocation', (location, callback) => {
        io.emit('locationMessage', generateLocationMessage(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        console.log('Entrou', user)


        if (user) {
            console.log('Foi')
            io.to(user[0].room).emit('message', generateMessage(`${user[0].username} has left!`))
        }
    }) 
})

server.listen(port, () => {
    console.log('Server is up on port ' + port)
})