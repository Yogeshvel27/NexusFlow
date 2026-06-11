async function run() {
  const apiKey = 'sk_test_Yu6TnYYm0u1ap5wBxfTljQgxWPUFWKFBzOFTMLvDr7';
  // Let's first list all organizations to find the active org ID
  const orgsRes = await fetch('https://api.clerk.com/v1/organizations', {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });
  const orgs = await orgsRes.json();
  console.log("ORGANIZATIONS:", orgs);

  if (orgs && orgs.data && orgs.data.length > 0) {
    const orgId = orgs.data[0].id;
    console.log("Fetching memberships for organization:", orgId);
    const membersRes = await fetch(`https://api.clerk.com/v1/organizations/${orgId}/memberships`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const memberships = await membersRes.json();
    console.log("MEMBERSHIPS:", memberships.data.map(m => ({
      id: m.id,
      role: m.role,
      user: m.public_user_data
    })));
  }
  
  // Also list all users
  const usersRes = await fetch('https://api.clerk.com/v1/users', {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });
  const users = await usersRes.json();
  console.log("ALL USERS:", users.map(u => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email_addresses?.[0]?.email_address
  })));
}

run();
