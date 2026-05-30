const form = document.getElementById('questions-form');
const passageElement = document.getElementById('passage');
const titleElement = document.getElementById('test-title');
const submitButton = document.getElementById('submit-btn');
const resultElement = document.getElementById('result');
const timerElement = document.getElementById('timer');

let currentTest = null;
let seconds = 0;

function getTestIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('test') || 'reading-test-1';
}

function normaliseAnswer(answer) {
  return String(answer).trim().toLowerCase();
}

function startTimer() {
  setInterval(() => {
    seconds += 1;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }, 1000);
}

function renderQuestion(question) {
  const block = document.createElement('div');
  block.className = 'question-block';

  const label = document.createElement('label');
  label.setAttribute('for', `q${question.number}`);
  label.textContent = `${question.number}. ${question.question}`;
  block.appendChild(label);

  if (question.type === 'true_false_not_given') {
    const select = document.createElement('select');
    select.id = `q${question.number}`;
    select.name = `q${question.number}`;

    ['', 'TRUE', 'FALSE', 'NOT GIVEN'].forEach(optionText => {
      const option = document.createElement('option');
      option.value = optionText;
      option.textContent = optionText || 'Select an answer';
      select.appendChild(option);
    });

    block.appendChild(select);
  } else {
    const input = document.createElement('input');
    input.id = `q${question.number}`;
    input.name = `q${question.number}`;
    input.type = 'text';
    input.placeholder = 'Type your answer';
    block.appendChild(input);
  }

  return block;
}

function renderTest(test) {
  titleElement.textContent = test.title;
  passageElement.textContent = test.passage;
  form.innerHTML = '';

  test.questions.forEach(question => {
    form.appendChild(renderQuestion(question));
  });
}

function markAnswers() {
  let score = 0;
  let feedbackHtml = '';

  currentTest.questions.forEach(question => {
    const input = document.querySelector(`[name="q${question.number}"]`);
    const userAnswer = input ? input.value : '';
    const isCorrect = normaliseAnswer(userAnswer) === normaliseAnswer(question.answer);

    if (isCorrect) {
      score += 1;
    }

    feedbackHtml += `
      <div class="result-item">
        <p><strong>Question ${question.number}</strong>: <span class="${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'Correct' : 'Incorrect'}</span></p>
        <p>Your answer: ${userAnswer || 'No answer'}</p>
        <p>Correct answer: ${question.answer}</p>
      </div>
    `;
  });

  resultElement.innerHTML = `
    <h2>Your Score: ${score}/${currentTest.questions.length}</h2>
    ${feedbackHtml}
  `;
  resultElement.classList.remove('hidden');
  resultElement.scrollIntoView({ behavior: 'smooth' });
}

async function loadTest() {
  const testId = getTestIdFromUrl();
  const response = await fetch(`data/${testId}.json`);
  currentTest = await response.json();
  renderTest(currentTest);
  startTimer();
}

submitButton.addEventListener('click', markAnswers);
loadTest();
