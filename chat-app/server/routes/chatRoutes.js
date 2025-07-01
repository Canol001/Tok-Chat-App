const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const User = require('../models/User');
const Message = require('../models/Message');

// Configure multer
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (_, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Register/Login (very simple, just name + phone)
router.post('/register', async (req, res) => {
  const { name, phone } = req.body;

  let user = await User.findOne({ phone });
  if (!user) user = await User.create({ name, phone });

  res.json(user);
});

// List users
router.get('/users', async (_, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

// Send message (text or image)
router.post('/message', upload.single('image'), async (req, res) => {
  const { sender, receiver, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const msg = await Message.create({ sender, receiver, content, imageUrl });
  res.json(msg);
});

// Get messages between two users
router.get('/messages/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;

  const messages = await Message.find({
    $or: [
      { sender: user1, receiver: user2 },
      { sender: user2, receiver: user1 }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);
});


router.delete('/message/:id', async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      {
        deleted: true,
        content: '',
        imageUrl: '',
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Message not found' });
    res.json({ message: '🗑️ Message marked as deleted', data: updated });
  } catch (error) {
    console.error('❌ Delete Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
