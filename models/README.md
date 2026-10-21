# Models folder

The original Mongoose model schemas remain in `server.js` in this conservative
refactor. They are not moved yet, because extracting them safely requires updating
every controller reference and testing all API behavior. This folder is provided
for a future model extraction without silently changing the existing application.
