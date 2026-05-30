async function loadTestList() {
  const list = document.getElementById('test-list');

  try {
    const response = await fetch('data/tests.json');
    if (!response.ok) throw new Error('Could not load test list.');

    const data = await response.json();
    list.innerHTML = '';

    data.tests.forEach((test) => {
      const link = document.createElement('a');
      link.className = 'test-card';
      link.href = `test.html?test=${encodeURIComponent(test.id)}`;
      link.innerHTML = `
        <div>
          <h3>${test.title}</h3>
          <p>${test.description}</p>
        </div>
        <strong>Start test →</strong>
      `;
      list.appendChild(link);
    });
  } catch (error) {
    list.innerHTML = '<p>Sorry, the test list could not be loaded.</p>';
    console.error(error);
  }
}

loadTestList();
