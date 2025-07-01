import EmojiPicker from 'emoji-picker-react';
import { Camera, Check, Download, Menu, MessageSquare, MoreVertical, SendHorizonal, Smile, Trash2, X } from 'lucide-react'; // Added MessageSquare
import { useEffect, useRef, useState } from 'react';
import api from '../services/axios';
import socket from '../services/socket';

interface User {
  _id: string;
  name: string;
  phone: string;
}

interface Message {
  _id?: string;
  sender: string;
  receiver: string;
  content?: string;
  imageUrl?: string;
  createdAt?: string;
  deleted?: boolean; // Added for soft deletion
}

const Chat = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data.filter((u: User) => u._id !== currentUser._id));
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser) return;
      try {
        const res = await api.get(`/messages/${currentUser._id}/${selectedUser._id}`);
        setMessages(res.data);
        scrollToBottom();
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    fetchMessages();
  }, [selectedUser]);

  // Socket.IO: Handle new messages and deletions
  useEffect(() => {
    socket.on('newMessage', (msg: Message) => {
      if (
        (msg.sender === currentUser._id && msg.receiver === selectedUser?._id) ||
        (msg.sender === selectedUser?._id && msg.receiver === currentUser._id)
      ) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    });

    socket.on('deleteMessage', (messageId: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, deleted: true, content: '', imageUrl: '' } : msg
        )
      );
      scrollToBottom();
    });

    return () => {
      socket.off('newMessage');
      socket.off('deleteMessage');
    };
  }, [selectedUser]);

  // Handle sending messages
  const handleSend = async () => {
    if (!selectedUser || (!text && !image)) return;

    const formData = new FormData();
    formData.append('sender', currentUser._id);
    formData.append('receiver', selectedUser._id);
    if (text) formData.append('content', text);
    if (image) formData.append('image', image);

    try {
      const res = await api.post('/message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      socket.emit('sendMessage', res.data);
      setText('');
      setImage(null);
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
        setPreviewImage(null);
      }
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle deleting messages
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/message/${id}`);
      socket.emit('deleteMessage', id);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === id ? { ...msg, deleted: true, content: '', imageUrl: '' } : msg
        )
      );
      setOpenMenuId(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar: User List */}
      <div
        className={`fixed md:static inset-0 bg-white md:w-1/4 w-3/4 z-50 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto border-r border-gray-200`}
      >
        <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
          <h2 className="text-xl font-semibold">👥 Users</h2>
          <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        {users.map((u) => (
          <div
            key={u._id}
            onClick={() => {
              setSelectedUser(u);
              setIsSidebarOpen(false);
            }}
            className={`flex items-center gap-3 p-4 border-b hover:bg-gray-100 cursor-pointer transition-colors ${
              selectedUser?._id === u._id ? 'bg-blue-50 text-blue-600' : ''
            }`}
          >
            <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
              {u.name[0].toUpperCase()}
            </div>
            <span>{u.name}</span>
          </div>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <span className="text-lg font-semibold">
              {selectedUser ? `Chat with ${selectedUser.name}` : 'Select a user to start chatting'}
            </span>
          </div>
        </div>

        {/* Messages or Placeholder */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
          {selectedUser ? (
            <>
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={msg._id || i}
                    className={`flex ${
                      msg.sender === currentUser._id ? 'justify-end' : 'justify-start'
                    } group relative`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm ${
                        msg.sender === currentUser._id
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-800'
                      }`}
                    >
                      {msg.deleted ? (
                        <div className="italic text-gray-400">This message was deleted</div>
                      ) : (
                        <>
                          {msg.content && <div>{msg.content}</div>}
                          {msg.imageUrl && (
                            <div className="mt-2">
                              <img
                                src={`http://localhost:5000${msg.imageUrl}`}
                                alt="Chat image"
                                className="max-h-48 rounded-lg border"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-2 text-xs opacity-80">
                            <span>
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'N/A'}
                            </span>
                            {msg.imageUrl && !msg.deleted && (
                              <a
                                href={`http://localhost:5000${msg.imageUrl}`}
                                download
                                className="hover:opacity-90"
                              >
                                <Download
                                  className={`w-4 h-4 ${
                                    msg.sender === currentUser._id
                                      ? 'text-white'
                                      : 'text-blue-600'
                                  }`}
                                />
                              </a>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {msg.sender === currentUser._id && msg._id && !msg.deleted && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === msg._id ? null : msg._id)}
                          className="p-1 hover:bg-gray-200 rounded-full"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                        {openMenuId === msg._id && (
                          <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 z-10">
                            <button
                              onClick={() => handleDelete(msg._id!)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-fade-in">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold">Start a Conversation</h2>
              <p className="text-sm mt-2 text-center max-w-md">
                Select a contact from the list on the left to begin chatting.
              </p>
            </div>
          )}
        </div>

        {/* Sticky Message Input */}
        {selectedUser && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex items-center gap-2 z-10 shadow-md">
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Smile className="w-5 h-5 text-gray-700" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 z-20">
                <EmojiPicker onEmojiClick={handleEmojiClick} height={350} width={300} />
              </div>
            )}
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="file"
              onChange={handleImageChange}
              className="hidden"
              id="fileUpload"
              accept="image/*"
            />
            <label
              htmlFor="fileUpload"
              className="cursor-pointer p-2 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Camera className="w-5 h-5 text-gray-600" />
            </label>
            <button
              onClick={handleSend}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-colors"
            >
              <SendHorizonal className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-xl shadow-lg max-w-md w-full">
            <img src={previewImage} alt="Preview" className="w-full rounded-lg mb-4" />
            <div className="flex justify-between">
              <button
                onClick={() => {
                  handleSend();
                  setPreviewImage(null);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Check className="w-5 h-5" /> Send
              </button>
              <button
                onClick={() => {
                  setImage(null);
                  if (previewImage) URL.revokeObjectURL(previewImage);
                  setPreviewImage(null);
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <X className="w-5 h-5" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;