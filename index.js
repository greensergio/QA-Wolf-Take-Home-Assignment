const { chromium } = require('playwright');
const readline = require('readline');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Set up readline to get user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  // Function to ask a question and return the user's answer
  function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
  }
  // Go to Hacker News newest page
  await page.goto('https://news.ycombinator.com/newest');
  let articles = [];
  let moreButtonExists = true;
  // Function to parse time strings into minutes
  function parseTime(timeString) {
    const timeMatch = timeString.match(/(\d+)\s*(minute|hour|day|week)s?\s*ago/);
    if (timeMatch) {
      const value = parseInt(timeMatch[1], 10);
      switch (timeMatch[2]) {
        case 'minute':
          return value;
        case 'hour':
          return value * 60;
        case 'day':
          return value * 1440;
        case 'week':
          return value * 10080;
        default:
          return Infinity;
      }
    }
    return Infinity; // For any other cases like 'No time'
  }
  // Loop to keep clicking "More" 
  while (articles.length < 100 && moreButtonExists) {
    // Wait for the articles to load
    await page.waitForTimeout(2000);
    // Scrape the articles on the current page
    const newArticles = await page.$$eval('.athing', nodes =>
      nodes.map(node => {
        const title = node.querySelector('.titleline a')?.innerText || 'No title';
        const timeElement = node.nextElementSibling.querySelector('.age a');
        const time = timeElement ? timeElement.innerText : 'No time';
        return { title, time };
      })
    );
    articles = [...articles, ...newArticles].slice(0, 100); // Ensure we stop at exactly 100 articles
    console.log(`Number of articles found: ${articles.length}`);
    // If there are still fewer than 100 articles, click the "More" button
    moreButtonExists = await page.$('a.morelink');
    if (articles.length >= 100) {
      break; // Stop if we reach 100 articles
    }
    if (moreButtonExists && articles.length < 100) {
      await page.click('a.morelink');
      await page.waitForTimeout(2000); // Give time for the next set of articles to load
    }
  }
  // Validate that articles are sorted from newest to oldest
  let isSorted = true;
  let breakingIndex = -1;
  for (let i = 1; i < articles.length; i++) {
    const currentTime = parseTime(articles[i].time);
    const previousTime = parseTime(articles[i - 1].time);
    // Check if articles are in order from newest to oldest
    if (currentTime < previousTime) {
      isSorted = false;
      breakingIndex = i;
      break;
    }
  }
  // Ask if the user wants to see sample articles
  const showSamples = await askQuestion('Do you want to see sample articles? (yes/no): ');
  if (showSamples.toLowerCase() === 'yes') {
    console.log('Sample articles:', articles.slice(0, 5));
  }
  // Ensure you have exactly 100 articles and they are sorted correctly
  if (articles.length === 100) {
    if (isSorted) {
      console.log('The first 100 articles are sorted from newest to oldest.');
    } else {
      console.log('The first 100 articles are NOT sorted from newest to oldest.');
      console.log(`Sorting issue detected at index ${breakingIndex}.`);
      console.log('Article at breaking index:', articles[breakingIndex]);
      console.log('Previous article:', articles[breakingIndex - 1]);
    }
  } else {
    console.log('There are fewer than 100 articles.');
  }
  
  // Close browser and readline interface
  await browser.close();
  rl.close();
})();