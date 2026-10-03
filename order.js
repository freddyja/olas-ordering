// Ola's order model. Prices are cents so totals cannot drift.
// Side of beans is omitted on purpose: the printed price was scratched out.
// Burrito #1 still includes beans as an ingredient, matching the menu.
// BBQ chicken and pork have no printed price. They stay inquire (null cents).

export const SMS_E164 = '+15052887576';
export const SMS_DISPLAY = '505-288-7576';

export const DIETS = ['dairy free', 'gluten free', 'meat free'];

export const OPEN_DAYS = new Set(['Wed', 'Thu', 'Fri', 'Sat']);
export const OPEN_START_MIN = 8 * 60;
export const OPEN_END_MIN = 13 * 60;

const chili = {
  key: 'chili',
  label: 'Chili',
  choices: [
    { id: 'green', label: 'Green chili' },
    { id: 'red', label: 'Red chili' },
  ],
};

export const SECTIONS = [
  {
    id: 'breakfast',
    title: 'Breakfast',
    items: [
      {
        id: 'burrito-1',
        num: '1',
        name: 'Egg, Cheese, Beans, Potato',
        detail: 'Breakfast burrito. Choice of green or red chili.',
        cents: 1050,
        options: [chili],
      },
      {
        id: 'burrito-2',
        num: '2',
        name: 'Bacon, Egg, Cheese, Potato',
        detail: 'Breakfast burrito. Choice of green or red chili.',
        cents: 1150,
        options: [chili],
      },
      {
        id: 'burrito-3',
        num: '3',
        name: 'Ham, Egg, Cheese, Potato',
        detail: 'Breakfast burrito. Choice of green or red chili.',
        cents: 1065,
        options: [chili],
      },
      {
        id: 'burrito-4',
        num: '4',
        name: 'Sausage, Egg, Cheese, Potato',
        detail: 'Breakfast burrito. Choice of green or red chili.',
        cents: 1095,
        options: [chili],
      },
      {
        id: 'burrito-5',
        num: '5',
        name: 'Smoked Chicken, Egg, Cheese, Potato',
        detail: 'Breakfast burrito. Choice of green or red chili.',
        cents: 1195,
        options: [chili],
      },
      {
        id: 'breakfast-sandwich',
        name: 'Hot Breakfast Sandwich',
        detail: 'Cheese and eggs. White or multigrain bread. Bacon, ham, or sausage.',
        cents: 1150,
        options: [
          {
            key: 'bread',
            label: 'Bread',
            choices: [
              { id: 'white', label: 'White' },
              { id: 'multigrain', label: 'Multigrain' },
            ],
          },
          {
            key: 'meat',
            label: 'Meat',
            choices: [
              { id: 'bacon', label: 'Bacon' },
              { id: 'ham', label: 'Ham' },
              { id: 'sausage', label: 'Sausage' },
            ],
          },
        ],
      },
      {
        id: 'biscuit',
        name: 'Biscuit & Gravy',
        cents: 900,
      },
    ],
  },
  {
    id: 'lunch',
    title: 'Lunch',
    items: [
      {
        id: 'ham-sandwich',
        num: '7',
        name: 'Baked Ham Sandwich',
        cents: 1350,
      },
      {
        id: 'bbq-box',
        num: '8',
        name: 'BBQ Sandwich Lunch Box',
        detail: 'Brisket has a printed price. Chicken and pork do not — they are inquire, not a guessed price.',
        priceFrom: 'meat',
        options: [
          {
            key: 'meat',
            label: 'Meat',
            choices: [
              { id: 'brisket', label: 'Brisket', cents: 1275 },
              { id: 'chicken', label: 'Chicken', inquire: true },
              { id: 'pork', label: 'Pork', inquire: true },
            ],
          },
        ],
      },
      {
        id: 'bbq-platter',
        num: '9',
        name: 'BBQ Platter',
        detail: 'Platter, or all brisket.',
        priceFrom: 'style',
        options: [
          {
            key: 'style',
            label: 'Style',
            choices: [
              { id: 'platter', label: 'Platter', cents: 1800 },
              { id: 'all-brisket', label: 'All brisket', cents: 2000 },
            ],
          },
        ],
      },
      {
        id: 'chili-dog',
        num: '10',
        name: 'Chili Dog Lunch Deal',
        cents: 1175,
      },
      {
        id: 'daily-special',
        name: 'Daily special',
        detail: 'No printed price. Ask, and Ola’s will confirm.',
        inquire: true,
        fields: [
          {
            key: 'what',
            label: 'What do you want to ask about?',
            placeholder: 'Today’s special',
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'sides',
    title: 'Sides, sweets, and drinks',
    note: 'Plus tax. Beans are not offered.',
    items: [
      { id: 'potato-salad', name: 'Potato Salad', cents: 250 },
      { id: 'collard-greens', name: 'Collard Greens', cents: 400 },
      { id: 'corn-bread', name: 'Corn Bread', cents: 175 },
      { id: 'dinner-rolls', name: 'Dinner Rolls', cents: 250 },
      { id: 'peach-cobbler', name: 'Peach Cobbler', cents: 600 },
      {
        id: 'drinks',
        name: 'Assorted drinks',
        cents: 225,
        fields: [
          {
            key: 'which',
            label: 'Which drink?',
            placeholder: 'Optional',
            required: false,
          },
        ],
      },
    ],
  },
];

export function allItems() {
  return SECTIONS.flatMap((section) => section.items);
}

export function findItem(id) {
  return allItems().find((item) => item.id === id) || null;
}

export function formatCents(cents) {
  const neg = cents < 0;
  const value = Math.abs(cents);
  const text = `$${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
  return neg ? `-${text}` : text;
}

export function itemTitle(item) {
  return item.num ? `#${item.num} ${item.name}` : item.name;
}

export function priceColumn(item) {
  if (item.priceFrom) {
    const group = item.options.find((option) => option.key === item.priceFrom);
    return group.choices.map((choice) => {
      if (choice.inquire || choice.cents == null) return `${choice.label}: inquire`;
      return `${choice.label}: ${formatCents(choice.cents)}`;
    });
  }
  if (item.inquire || item.cents == null) return ['inquire'];
  return [formatCents(item.cents)];
}

export function denverParts(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value;
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return { weekday: bag.weekday, hour, minute: Number(bag.minute) };
}

export function denverClock(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

/** Open Wed–Sat from 8:00 AM until 1:00 PM America/Denver. Closed at 1:00 PM. */
export function isOpenAt(date) {
  const parts = denverParts(date);
  if (!OPEN_DAYS.has(parts.weekday)) return false;
  const mins = parts.hour * 60 + parts.minute;
  return mins >= OPEN_START_MIN && mins < OPEN_END_MIN;
}

export function optionText(item, selection) {
  const parts = [];
  for (const group of item.options || []) {
    const choice = group.choices.find((entry) => entry.id === selection[group.key]);
    if (choice) parts.push(choice.label);
  }
  for (const field of item.fields || []) {
    const value = String(selection[field.key] || '').replace(/\s+/g, ' ').trim();
    if (value) parts.push(value);
  }
  return parts.join(', ');
}

export function lineUnitCents(item, selection) {
  if (item.priceFrom) {
    const group = item.options.find((option) => option.key === item.priceFrom);
    const choice = group.choices.find((entry) => entry.id === selection[group.key]);
    if (!choice || choice.inquire || choice.cents == null) return null;
    return choice.cents;
  }
  if (item.inquire || item.cents == null) return null;
  return item.cents;
}

export function missingRequired(item, selection) {
  const missing = [];
  for (const group of item.options || []) {
    if (!selection[group.key]) missing.push(group.label);
  }
  for (const field of item.fields || []) {
    if (field.required && !String(selection[field.key] || '').trim()) missing.push(field.label);
  }
  return missing;
}

export function lineKey(item, selection) {
  return `${item.id}|${optionText(item, selection)}`;
}

export function formatLine(line) {
  const head = `${line.qty} x ${line.title}`;
  const opt = line.optionText ? ` (${line.optionText})` : '';
  if (line.unitCents == null) return `${head}${opt} — inquire`;
  const total = formatCents(line.unitCents * line.qty);
  if (line.qty > 1) return `${head}${opt} (${formatCents(line.unitCents)} each) — ${total}`;
  return `${head}${opt} — ${total}`;
}

export function pricedSubtotalCents(lines) {
  return lines.reduce((sum, line) => {
    if (line.unitCents == null) return sum;
    return sum + line.unitCents * line.qty;
  }, 0);
}

export function oneLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function buildOrderText({ name, phone, diets, notes, lines }) {
  const rows = ["Ola's order", `Name: ${oneLine(name)}`, `Phone: ${oneLine(phone)}`];
  const dietList = DIETS.filter((diet) => diets.includes(diet));
  if (dietList.length) rows.push(`Diets: ${dietList.join(', ')}`);
  rows.push('');
  for (const line of lines) rows.push(formatLine(line));
  rows.push('');
  rows.push(`Priced subtotal: ${formatCents(pricedSubtotalCents(lines))}`);
  rows.push('Tax not included.');
  if (lines.some((line) => line.unitCents == null)) {
    rows.push('Inquire items have no price and are not in the subtotal.');
  }
  const note = oneLine(notes);
  if (note) rows.push(`Notes: ${note}`);
  return rows.join('\n');
}

/** Cross-platform Messages link. iOS reads &body; Android reads ?body. ?&body covers both. */
export function buildSmsUrl(body) {
  return `sms:${SMS_E164}?&body=${encodeURIComponent(body)}`;
}
