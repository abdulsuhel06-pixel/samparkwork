import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export const getOrCreateConversation = async (userA, userB) => {
  let convo = await Conversation.findOne({ participants: { $all: [userA, userB] } });
  if (!convo) {
    convo = await Conversation.create({ participants: [userA, userB] });
  }
  return convo;
};

export const saveSocketMessage = async ({ conversationId, from, to, content }) => {
  let convo = conversationId 
    ? await Conversation.findById(conversationId)
    : await getOrCreateConversation(from, to);

  const msg = await Message.create({
    conversation: convo._id, from, to, content
  });

  convo.lastMessage = content;
  await convo.save();

  return (await msg.populate('from to', 'name avatar')).toObject();
};
