const EMOJI_URL =
  "https://raw.githubusercontent.com/pvme/pvme-settings/master/emojis/emojis_v2.json";

const PLACEHOLDER_RE = /\${{(\d+)}}/g;
const BRACKET_SECTION_RE = /(\[.*?\])/;
const TOKEN_RE = /[A-Za-z0-9_-]+$/;
const EXPR_RE = /[^\s]+$/;
const DISCORD_EMOJI_RE = /<:([^:]+):\d+>/g;
const ARROW_RE = /->/g;
const OPERATOR_SPACING_RE = /\s*\+\s*/g;

const emojiMap = new Map(); // alias -> emoji[]
const emojiById = new Map(); // emoji_id -> emoji
const aliasBuckets = new Map(); // first char -> aliases[]
let emojiList = [];
let aliasRegex = null;

let suggestions = [];
let activeIndex = -1;
let compiledDiscord = "";

const autoArrowToggle = document.getElementById("autoArrowToggle");
const input = document.getElementById("input");
const output = document.getElementById("output");
const suggestionBox = document.getElementById("suggestions");
const caretMirror = document.getElementById("caretMirror");
const inputContainer = document.getElementById("inputContainer");
const outputContainer = document.getElementById("outputContainer");
const copyDiscordBtn = document.getElementById("copyDiscord");
const exportToTxtBtn = document.getElementById("exportToTxt");
const changeViewBtn = document.getElementById("changeView");

function escapeHTML(str) {
  return str.replace(
    /[&<>"]/g,
    (a) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[a],
  );
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addAlias(alias, emoji) {
  const lower = alias.toLowerCase();

  if (!emojiMap.has(lower)) emojiMap.set(lower, []);
  emojiMap.get(lower).push(emoji);
}

function buildIndexes() {
  emojiList = [...emojiMap.keys()].sort((a, b) => b.length - a.length);

  aliasBuckets.clear();

  for (const alias of emojiList) {
    const first = alias[0];
    if (!aliasBuckets.has(first)) aliasBuckets.set(first, []);
    aliasBuckets.get(first).push(alias);
  }

  aliasRegex = emojiList.length
    ? new RegExp(emojiList.map(escapeRegex).join("|"), "ig")
    : null;
}

async function loadEmojis() {
  const res = await fetch(EMOJI_URL);
  const json = await res.json();

  for (const cat of json.categories) {
    for (const e of cat.emojis) {
      if (!e.emoji_id) continue;

      const obj = {
        id: String(e.emoji_id),
        syntax: `<:${e.id}:${e.emoji_id}>`,
        name: e.id,
      };

      emojiById.set(obj.id, obj);

      addAlias(e.id, obj);

      if (e.id_aliases) {
        for (const alias of e.id_aliases) addAlias(alias, obj);
      }
    }
  }

  buildIndexes();
}

function splitAliases(token) {
  const lower = token.toLowerCase();
  const parts = [];
  let i = 0;

  while (i < lower.length) {
    const bucket = aliasBuckets.get(lower[i]);
    if (!bucket) return null;

    let match = null;

    for (const alias of bucket) {
      if (lower.startsWith(alias, i)) {
        match = alias;
        break;
      }
    }

    if (!match) return null;

    parts.push(match);
    i += match.length;
  }

  return parts.length > 1 ? parts : null;
}

function normaliseOperators(text) {
  return text.replace(OPERATOR_SPACING_RE, " + ");
}

function replaceAliasesInSegment(segment) {
  if (!aliasRegex) return segment;

  return segment.replace(aliasRegex, (matched) => {
    const emojis = emojiMap.get(matched.toLowerCase());
    if (!emojis || !emojis.length) return matched;

    let out = "";
    for (let i = 0; i < emojis.length; i++) {
      if (i) out += " ";
      out += "${{" + emojis[i].id + "}}";
    }
    return out;
  });
}

function compile() {
  let text = input.value;
  text = text.replace(ARROW_RE, "→");
  text = text.replace(DISCORD_EMOJI_RE, "$1");

  const sections = text.split(BRACKET_SECTION_RE);
  let result = "";

  for (const part of sections) {
    if (part.startsWith("[") && part.endsWith("]")) {
      result += escapeHTML(part.slice(1, -1));
    } else {
      result += replaceAliasesInSegment(part);
    }
  }

  const html = result.replace(
    PLACEHOLDER_RE,
    (_, id) =>
      `<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/${id}.png?v=1">`,
  );

  const discord = result.replace(PLACEHOLDER_RE, (_, id) => {
    const emoji = emojiById.get(id);
    return emoji ? emoji.syntax : "";
  });

  compiledDiscord = discord;
  output.innerHTML = html.replace(/\n/g, "<br>");
}

function hideSuggestions() {
  suggestionBox.style.display = "none";
  suggestions = [];
  activeIndex = -1;
}

function updateSuggestions() {
  const caret = input.selectionStart;
  const before = input.value.slice(0, caret);
  const token = (before.match(TOKEN_RE) || [])[0];

  if (!token) {
    hideSuggestions();
    return;
  }

  const low = token.toLowerCase();
  const bucket = aliasBuckets.get(low[0]);

  if (!bucket) {
    hideSuggestions();
    return;
  }

  const seen = new Set();
  const nextSuggestions = [];

  for (const alias of bucket) {
    if (!alias.startsWith(low) || alias === low) continue;

    const emojis = emojiMap.get(alias);
    if (!emojis || !emojis.length) continue;

    const emoji = emojis[0];
    if (seen.has(emoji.id)) continue;

    seen.add(emoji.id);
    nextSuggestions.push({ alias, emoji });

    if (nextSuggestions.length >= 10) break;
  }

  if (!nextSuggestions.length) {
    hideSuggestions();
    return;
  }

  suggestions = nextSuggestions;
  activeIndex = 0;
  renderSuggestions();
}

function renderSuggestions() {
  suggestionBox.innerHTML = "";

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    const div = document.createElement("div");

    div.className = "suggestion" + (i === activeIndex ? " active" : "");
    div.innerHTML = `<img class="disc-emoji" src="https://cdn.discordapp.com/emojis/${s.emoji.id}.png?v=1"><span>${s.alias}</span>`;
    div.onclick = () => applySuggestion(i);

    fragment.appendChild(div);
  }

  suggestionBox.appendChild(fragment);

  const pos = getCaretPosition();
  const left = Math.min(pos.x, input.clientWidth - 200);

  suggestionBox.style.left = left + 32 + "px";
  suggestionBox.style.top = pos.y + 13 + "px";
  suggestionBox.style.display = "block";
}

function applySuggestion(index) {
  const suggestion = suggestions[index];
  if (!suggestion) return;

  let word = suggestion.alias;
  if (autoArrowToggle.checked) word += " → ";

  const pos = input.selectionStart;
  const before = input.value.slice(0, pos);
  const after = input.value.slice(pos);

  const match = before.match(TOKEN_RE);
  if (!match) return;

  const start = pos - match[0].length;

  input.value = before.slice(0, start) + word + after;

  const newPos = start + word.length;
  input.setSelectionRange(newPos, newPos);

  compile();
  hideSuggestions();
}

function handleSpaceKey(e) {
  const pos = input.selectionStart;
  const before = input.value.slice(0, pos);
  const after = input.value.slice(pos);

  const match = before.match(EXPR_RE);
  if (!match) return false;

  const expr = match[0];
  const start = pos - expr.length;

  let replacement = expr;

  const split = splitAliases(expr);
  if (split) replacement = split.join(" ");

  replacement = normaliseOperators(replacement);

  const parts = replacement.trim().split(/\s+/);
  const last = parts[parts.length - 1];

  // detect emoji alias even if prefixed with s or r
  let emojiAlias = last;

  if (!emojiMap.has(emojiAlias) && emojiAlias.length > 1) {
    const maybeAlias = emojiAlias.slice(1);
    if (
      (emojiAlias[0] === "s" || emojiAlias[0] === "r") &&
      emojiMap.has(maybeAlias)
    ) {
      emojiAlias = maybeAlias;
    }
  }

  const shouldArrow = autoArrowToggle.checked && emojiMap.has(emojiAlias);

  const needsChange = replacement !== expr || shouldArrow;
  if (!needsChange) return false;

  e.preventDefault();
  replacement += shouldArrow ? " → " : " ";

  input.value = before.slice(0, start) + replacement + after;

  const newPos = start + replacement.length;
  input.setSelectionRange(newPos, newPos);

  compile();
  hideSuggestions();
  return true;
}

input.addEventListener("input", () => {
  const pos = input.selectionStart;
  const before = input.value;
  const replaced = before.replace(ARROW_RE, "→");

  if (before !== replaced) {
    const diff = replaced.length - before.length;
    input.value = replaced;

    const newPos = pos + diff;
    input.setSelectionRange(newPos, newPos);
  }

  compile();
  updateSuggestions();
});

input.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    handleSpaceKey(e);
    return;
  }

  if (!suggestions.length) {
    if (e.key === "Escape" || e.key === "Backspace") hideSuggestions();
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex = (activeIndex + 1) % suggestions.length;
    renderSuggestions();
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
    renderSuggestions();
    return;
  }

  if (e.key === "ArrowRight" || e.key === "Tab" || e.key === "Enter") {
    e.preventDefault();
    applySuggestion(activeIndex);
    return;
  }

  if (e.key === "Escape" || e.key === "Backspace") {
    hideSuggestions();
  }
});

copyDiscordBtn.onclick = () => navigator.clipboard.writeText(compiledDiscord);

exportToTxtBtn.onclick = () => {
  const file = new File([compiledDiscord], "rotation.txt");
  const url = URL.createObjectURL(file);

  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();

  URL.revokeObjectURL(url);
};

changeViewBtn.onclick = function () {
  const stacked = this.dataset.stacked === "true";

  if (stacked) {
    inputContainer.className = "col-md-6 p-3";
    outputContainer.className = "col-md-6 p-3";
    this.dataset.stacked = "false";
  } else {
    inputContainer.className = "col-md-12 p-3";
    outputContainer.className = "col-md-12 p-3";
    this.dataset.stacked = "true";
  }
};

function getCaretPosition() {
  const style = getComputedStyle(input);

  caretMirror.style.font = style.font;
  caretMirror.style.padding = style.padding;
  caretMirror.style.width = input.clientWidth + "px";

  caretMirror.textContent = input.value.substring(0, input.selectionStart);

  const span = document.createElement("span");
  span.textContent = "|";
  caretMirror.appendChild(span);

  const rect = span.getBoundingClientRect();
  const parent = caretMirror.getBoundingClientRect();

  return {
    x: rect.left - parent.left,
    y: rect.top - parent.top,
  };
}

loadEmojis().then(compile);
