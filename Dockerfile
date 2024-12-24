# Use the official Node.js 18.20 image as the base image
FROM node:18.20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package.json package-lock.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

#RUN mkdir $HOME/.hyperlane
#RUN cp -r hyperlane/.hyperlane/* $HOME/.hyperlane/
#RUN npm install -g @hyperlane-xyz/cli

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/app.js"]
