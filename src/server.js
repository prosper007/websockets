import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import * as Notes from './controllers/note_controller';
import socketio from 'socket.io';
import http from 'http';
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce';

// DB Setup
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/notes';
mongoose.connect(mongoURI, { useNewUrlParser: true });
// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

// initialize
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


io.on('connection', (socket) => {
  let emitToSelf = (notes) => {
    socket.emit('notes', notes);
  };
  emitToSelf = debounce(emitToSelf, 200);

  let emitToOthers = (notes) => {
    socket.broadcast.emit('notes', notes);
  };
  emitToOthers = throttle(emitToOthers, 25);

  const pushNotesSmoothed = () => {
    Notes.getNotes().then((result) => {
      emitToSelf(result);
      emitToOthers(result);
    });
  };
  // on first connection emit notes
  Notes.getNotes().then((result) => {
    socket.emit('notes', result);
  });

  // pushes notes to everybody
  const pushNotes = () => {
    Notes.getNotes().then((result) => {
      // broadcasts to all sockets including ourselves
      io.sockets.emit('notes', result);
    });
  };

  // creates notes and
  socket.on('createNote', (fields) => {
    Notes.createNote(fields).then((result) => {
      pushNotes();
    }).catch((error) => {
      console.log(error);
      socket.emit('error', 'create failed');
    });
  });

  socket.on('updateNote', (id, fields) => {
    Notes.updateNote(id, fields).then(() => {
      if (fields.text) {
        pushNotes();
      } else {
        pushNotesSmoothed();
      }
    }).catch((error) => {
      console.log(error);
      socket.emit('error', 'update failed');
    })
  });

  socket.on('deleteNote', (id) => {
    Notes.deleteNote(id).then(() => {
      pushNotes();
    }).catch((error) => {
      console.log(error);
      socket.emit('error', 'delete failed');
    })
  });
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
server.listen(port);

console.log(`listening on: ${port}`);
