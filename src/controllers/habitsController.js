const { v4: uuidv4 } = require('uuid');
const store = require('../utils/store');
const dayjs = require('dayjs');

let OpenAI;
if (process.env.OPENAI_API_KEY) {
  try {
    const { OpenAI: OpenAIclass } = require('openai');
    OpenAI = new OpenAIclass({ apiKey: process.env.OPENAI_API_KEY });
  } catch (e) {
    console.warn('OpenAI package not available or failed to init, falling back to local suggestions.');
  }
}

const createHabit = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      const err = new Error('Invalid habit name');
      err.status = 400;
      throw err;
    }

    const habit = {
      id: uuidv4(),
      name: name.trim(),
      streak: 0,
      lastCompleted: null
    };

    const habits = await store.read();
    habits.push(habit);
    await store.write(habits);

    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
};

const listHabits = async (req, res, next) => {
  try {
    const habits = await store.read();
    res.json(habits);
  } catch (err) {
    next(err);
  }
};

const completeHabit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const habits = await store.read();
    const idx = habits.findIndex(h => h.id === id);
    if (idx === -1) {
      const err = new Error('Habit not found');
      err.status = 404;
      throw err;
    }

    const today = dayjs().format('YYYY-MM-DD');
    const habit = habits[idx];

    if (habit.lastCompleted === today) {
      return res.json(habit);
    }

    if (habit.lastCompleted) {
      const last = dayjs(habit.lastCompleted);
      if (last.add(1, 'day').format('YYYY-MM-DD') === today) {
        habit.streak = (habit.streak || 0) + 1;
      } else {
        habit.streak = 1;
      }
    } else {
      habit.streak = 1;
    }

    habit.lastCompleted = today;
    habits[idx] = habit;
    await store.write(habits);

    res.json(habit);
  } catch (err) {
    next(err);
  }
};

const deleteHabit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const habits = await store.read();
    const idx = habits.findIndex(h => h.id === id);
    if (idx === -1) {
      const err = new Error('Habit not found');
      err.status = 404;
      throw err;
    }
    const removed = habits.splice(idx, 1)[0];
    await store.write(habits);
    res.json({ deleted: true, habit: removed });
  } catch (err) {
    next(err);
  }
};

const suggestHabits = async (req, res, next) => {
  try {
    const { goal } = req.body;
    if (!goal || typeof goal !== 'string') {
      const err = new Error('Missing goal in request body');
      err.status = 400;
      throw err;
    }

    if (OpenAI) {
      try {
        const prompt = `You are a helpful assistant. Given the user goal: "${goal}", suggest 3 concise daily habits (each 2-6 words) that will help achieve that goal. Return JSON array of objects with {name, reason}.`;
        const response = await OpenAI.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200
        });
        const text = response.choices?.[0]?.message?.content || response.choices?.[0]?.text;
        let suggestions = [];
        try {
          suggestions = JSON.parse(text);
        } catch (e) {
          suggestions = text.split(/\n+/).filter(Boolean).slice(0,3).map(line => ({ name: line.trim(), reason: '' }));
        }
        return res.json({ source: 'openai', suggestions });
      } catch (e) {
        console.warn('OpenAI request failed, falling back to local suggestions.', e.message);
      }
    }

    const lower = goal.toLowerCase();
    const suggestions = [];
    if (lower.includes('weight') || lower.includes('lose') || lower.includes('kg') || lower.includes('fat')) {
      suggestions.push({ name: 'Walk 30 minutes', reason: 'Daily cardio to burn calories' });
      suggestions.push({ name: 'Track calories', reason: 'Monitor intake to create deficit' });
      suggestions.push({ name: 'No sugar drink', reason: 'Reduce empty calories' });
    } else if (lower.includes('study') || lower.includes('learn') || lower.includes('exam')) {
      suggestions.push({ name: 'Study 1 hour', reason: 'Daily focused study' });
      suggestions.push({ name: 'Active recall', reason: 'Practice retrieving knowledge' });
      suggestions.push({ name: 'Summarize notes', reason: 'Condense and review' });
    } else if (lower.includes('sleep')) {
      suggestions.push({ name: 'Sleep by 11pm', reason: 'Consistent bedtime improves sleep' });
      suggestions.push({ name: 'No screens 30m', reason: 'Reduce blue light before bed' });
      suggestions.push({ name: 'Wind-down ritual', reason: 'Relax before sleep' });
    } else {
      suggestions.push({ name: 'Daily 10-min effort', reason: 'Small daily action builds habit' });
      suggestions.push({ name: 'Track progress', reason: 'Logging increases adherence' });
      suggestions.push({ name: 'Review weekly', reason: 'Adjust and stay accountable' });
    }

    res.json({ source: 'fallback', suggestions });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createHabit,
  listHabits,
  completeHabit,
  deleteHabit,
  suggestHabits
};

