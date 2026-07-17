# Administrator setup

This build reserves the following administrator identity:

- Username: `Benleethom`
- Player name: `Ben`

## Railway

Create a private Railway variable before deploying:

```text
HEX_ADMIN_PASSWORD=choose-a-strong-password-here
```

The account is created automatically on startup. If `HEX_ADMIN_PASSWORD` is omitted on the first production start, the server generates a random temporary password and prints it once in the deploy log.

After logging in as `Benleethom`, open **User Management** from the lobby account controls. The screen can search registered users and reset another user's password. Password resets invalidate that user's existing saved sessions.

The administrator's own password cannot be reset from the user-management list. Change `HEX_ADMIN_PASSWORD` and restart the service to rotate the built-in administrator password; existing administrator sessions are revoked when the configured password changes.
