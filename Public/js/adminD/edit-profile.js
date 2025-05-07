document.getElementById('profileEditForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    location: formData.get('location'),
    picture: formData.get('picture'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    linkedin: formData.get('linkedin'),
    twitter: formData.get('twitter'),
    facebook: formData.get('facebook'),
    instagram: formData.get('instagram'),
    aboutMe: formData.get('aboutMe'),
    subscription: formData.get('subscription'),
    role: formData.get('role'),
  };

  try {
    const response = await fetch('/adminD/profile/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      alert('Profile updated successfully!');
      window.location.href = '/adminD/profile';
    } else {
      alert(result.message || 'Failed to update profile.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while updating the profile.');
  }
});