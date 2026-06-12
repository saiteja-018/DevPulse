const http = require('http');

async function testLogin() {
  try {
    console.log("Fetching CSRF token...");
    const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfRes.json();
    console.log("CSRF Data:", csrfData);

    const csrfToken = csrfData.csrfToken;
    const cookies = csrfRes.headers.get('set-cookie');
    console.log("Cookies:", cookies);

    console.log("\nAttempting to login...");
    const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies || ''
      },
      body: new URLSearchParams({
        csrfToken,
        email: 'test@example.com',
        password: 'password123',
        redirect: 'false'
      })
    });

    const loginData = await loginRes.json();
    console.log("Login Response Status:", loginRes.status);
    console.log("Login Response Data:", loginData);
  } catch (error) {
    console.error("Error during test:", error);
  }
}

testLogin();
