function isValidPassword(password) {
  // Minimum 8 chars, at least 1 letter and 1 number
  const regex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  return regex.test(password);
}

module.exports = { isValidPassword };