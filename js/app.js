const params = new URLSearchParams(window.location.search);
const testId = params.get('test') || 'reading-test-1';

let currentTest = null;
let timerSeconds = 60 * 60;
let timerInterval = null;
let submitted = false;

const titleEl = document.getElementById('test-title');
const passageEl = document.getElementById('passage');
const formEl = document.getElementById('answers-form');
const resultEl = document.getElementById('result');
const timerEl = document.getElementById('timer');
const progressEl = document.getElementById('question-progress');
const submitButton = document.getElementById('submit-button');
const resetButton = document.getElementById('reset-test');
const increaseFontButton = document.getElementById('increase-font');

function normaliseAnswer(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isCorrect(userAnswer, correctAnswer) {
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some((answer) => normaliseAnswer(answer) === normaliseAnswer(userAnswer));
  }
  return normaliseAnswer(userAnswer) === normaliseAnswer(correctAnswer);
}

function formatAnswer(answer) {
  return Array.isArray(answer) ? answer.join(' / ') : answer;
}

function getBandEstimate(score, total) {
  const percentage = total === 0 ? 0 : score / total;
  if (percentage >= 0.9) return '8.5 to 9.0';
  if (percentage >= 0.8) return '7.5 to 8.0';
  if (percentage >= 0.7) return '6.5 to 7.0';
  if (percentage >= 0.6) return '6.0';
  if (percentage >= 0.5) return '5.0 to 5.5';
  if (percentage >= 0.4) return '4.0 to 4.5';
  return 'Below 4.0';
}

function renderPassage(test) {
  titleEl.textContent = test.title;
  passageEl.innerHTML = test.passage
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('');
}

function renderQuestion(question) {
  const card = document.createElement('div');
  card.className = 'question-card';
  card.dataset.questionNumber = question.number;

  const meta = document.createElement('div');
  meta.className = 'question-meta';
  meta.innerHTML = `<span>Question ${question.number}</span><span>${question.typeLabel}</span>`;

  const prompt = document.createElement('p');
  prompt.className = 'question-text';
  prompt.textContent = question.question;

  card.appendChild(meta);
  card.appendChild(prompt);

  if (question.type === 'true_false_not_given') {
    const select = document.createElement('select');
    select.className = 'answer-select';
    select.name = `q${question.number}`;
    select.innerHTML = `
      <option value="">Select answer</option>
      <option value="TRUE">TRUE</option>
      <option value="FALSE">FALSE</option>
      <option value="NOT GIVEN">NOT GIVEN</option>
    `;
    card.appendChild(select);
  } else if (question.type === 'multiple_choice') {
    const options = document.createElement('div');
    options.className = 'options-list';

    question.options.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'option-item';
      label.innerHTML = `
        <input type="radio" name="q${question.number}" value="${option.value}">
        <span>${option.value}. ${option.text}</span>
      `;
      options.appendChild(label);
    });

    card.appendChild(options);
  } else {
    const input = document.createElement('input');
    input.className = 'answer-input';
    input.name = `q${question.number}`;
    input.type = 'text';
    input.placeholder = 'Type your answer here';
    card.appendChild(input);
  }

  return card;
}

function renderQuestions(test) {
  formEl.innerHTML = '';

  test.questionGroups.forEach((group) => {
    const groupHeader = document.createElement('section');
    groupHeader.className = 'question-card';
    groupHeader.innerHTML = `<h3>${group.title}</h3><p>${group.instructions}</p>`;
    formEl.appendChild(groupHeader);

    group.questions.forEach((question) => {
      formEl.appendChild(renderQuestion(question));
    });
  });
}

function getAllQuestions() {
  return currentTest.questionGroups.flatMap((group) => group.questions);
}

function getUserAnswer(question) {
  const name = `q${question.number}`;

  if (question.type === 'multiple_choice') {
    const checked = formEl.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : '';
  }

  const field = formEl.querySelector(`[name="${name}"]`);
  return field ? field.value : '';
}

function updateProgress() {
  if (!currentTest) return;

  const questions = getAllQuestions();
  const answered = questions.filter((question) => normaliseAnswer(getUserAnswer(question)) !== '').length;
  progressEl.textContent = `${answered}/${questions.length} answered`;
}

function updateTimer() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (timerSeconds <= 0 && !submitted) {
    submitAnswers();
    return;
  }

  timerSeconds -= 1;
}

function startTimer() {
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function submitAnswers() {
  if (submitted || !currentTest) return;

  submitted = true;
  clearInterval(timerInterval);
  submitButton.disabled = true;
  submitButton.textContent = 'Submitted';

  const questions = getAllQuestions();
  let score = 0;

  questions.forEach((question) => {
    const userAnswer = getUserAnswer(question);
    const correct = isCorrect(userAnswer, question.answer);
    const card = formEl.querySelector(`[data-question-number="${question.number}"]`);

    if (correct) score += 1;

    card.classList.add(correct ? 'correct' : 'incorrect');

    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.innerHTML = `
      <strong>${correct ? 'Correct' : 'Incorrect'}</strong><br>
      Your answer: ${userAnswer || '<em>No answer</em>'}<br>
      Correct answer: ${formatAnswer(question.answer)}<br>
      ${question.explanation ? `<span>${question.explanation}</span>` : ''}
    `;
    card.appendChild(feedback);
  });

  const band = getBandEstimate(score, questions.length);
  const percentage = Math.round((score / questions.length) * 100);

  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <h3>Your result</h3>
    <p>This is an estimated practice result based on this short sample test.</p>
    <div class="result-grid">
      <div class="result-item"><span>Raw score</span><strong>${score}/${questions.length}</strong></div>
      <div class="result-item"><span>Percentage</span><strong>${percentage}%</strong></div>
      <div class="result-item"><span>Estimated band</span><strong>${band}</strong></div>
    </div>
  `;

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadTest() {
  try {
    const response = await fetch(`data/${testId}.json`);
    if (!response.ok) throw new Error('Could not load test data.');

    currentTest = await response.json();
    timerSeconds = currentTest.durationMinutes * 60;

    renderPassage(currentTest);
    renderQuestions(currentTest);
    updateProgress();
    startTimer();
  } catch (error) {
    titleEl.textContent = 'Test not found';
    passageEl.innerHTML = '<p>Sorry, this test could not be loaded.</p>';
    console.error(error);
  }
}

formEl.addEventListener('input', updateProgress);
formEl.addEventListener('change', updateProgress);
submitButton.addEventListener('click', submitAnswers);
resetButton.addEventListener('click', () => window.location.reload());
increaseFontButton.addEventListener('click', () => passageEl.classList.toggle('large-text'));

loadTest();
