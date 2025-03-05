# MongoDB Setup Guide

This guide will help you set up MongoDB for your blog application.

## Local Installation

### Windows:

1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the installation wizard
3. Choose "Complete" setup type
4. Ensure "Install MongoDB as a Service" is checked
5. Complete the installation

After installation, MongoDB should be running as a Windows service on port 27017.

### Mac:

Using Homebrew:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu):

```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

## Verify Installation

To verify MongoDB is running:

```bash
# Connect to MongoDB shell
mongosh

# You should see a connection to localhost:27017
```

## Using MongoDB Atlas (Cloud Option)

If you prefer using MongoDB Atlas (cloud service) instead of a local installation:

1. Create an account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster (the free tier is sufficient for development)
3. Set up database access credentials
4. Whitelist your IP address
5. Get your connection string

Then update your `.env` file with:

```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
```

## Troubleshooting Connection Issues

If you're experiencing connection issues:

1. **Check if MongoDB is running**:
   - Windows: Check Services app for "MongoDB Server"
   - Mac/Linux: Run `ps aux | grep mongo`

2. **Verify the port is accessible**:
   - Try `telnet localhost 27017` or `nc -zv localhost 27017`

3. **Check connection string**:
   - For local connections, try `mongodb://127.0.0.1:27017/blog` instead of `localhost`
   - Ensure you've used the correct username and password

4. **Firewall Issues**:
   - Check if your firewall is blocking connections to port 27017

5. **MongoDB Atlas Specific**:
   - Ensure your IP is whitelisted in Atlas
   - Check if the user has appropriate permissions
