import Note from '../models/note_model';


export const getNotes = () => {
  return Note.find({}).then(notes => {
    return notes.reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
  });
};


export const createNote = (note) => {
  const n = new Note();
  n.title = note.title;
  n.x = note.x;
  n.y = note.y;
  n.zIndex = note.zIndex;
  n.text = note.text;
  return n.save();
};

export const updateNote = (id, fields) => {
  return Note.findById(id)
    .then((note) => {
      // check out this classy way of updating only the fields necessary
      Object.keys(fields).forEach((k) => {
        note[k] = fields[k];
      });
      return note.save();
    });
};

export const deleteNote = (id) => {
  return Note.deleteOne({ _id: id });
}
