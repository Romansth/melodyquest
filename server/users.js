const users = [];

//Adds a new user to the users array.
const addUser = (id, name, room) => {
  // Check if the user already exists in the room
  const existingUser = users.find(
    (user) => user.room === room && user.name === name
  );

  // Return an error if the username is taken
  if (existingUser) {
    return { error: "Username is taken" };
  }

  // Create a new user and add to the users array
  const user = { id, name, room };
  users.push(user);

  return { user };
};

//Retrieves a user by their ID.
const getUser = (id) => users.find((user) => user.id === id);

//Deletes a user by their ID.
const deleteUser = (id) => {
  const index = users.findIndex((user) => user.id === id);
  // Remove and return the user if found
  if (index !== -1) return users.splice(index, 1)[0];
};

//Retrieves all users in a specific room.
const getUsers = (room) => users.filter((user) => user.room === room);

module.exports = { addUser, getUser, deleteUser, getUsers };
