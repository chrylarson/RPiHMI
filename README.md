RPiHMI
======

Raspberry Pi web based HMI for machine control

A node.js and socket.io based HMI for controlling the GPIO pins on the Raspberry Pi. This project includes user authentication, web based HMI and commands to interface with the GPIO pins. The technologies and libraries used include node.js, socket.io, passport, bootstrap, gpio-admin, sqlite3, redis, and express.

Start with the latest Raspbian Wheezy OS installed on a Raspberry Pi, then open a terminal and run the following commands to setup the environment to run the application. Once the application is running use a web browser to visit the Raspberry Pi's IP address. (To get the Raspberry Pi's IP Address enter IFCONFIG in a terminal on the RPi.)

apt-get install libssl-dev
apt-get install curl
apt-get install git-core
git clone git://github.com/joyent/node.git
cd node/
git checkout v0.8.19
./configure
make
...wait an hour or two
...maybe three hours
sudo make install
apt-get install sqlite3
apt-get install redis-server
npm install connect-flash ejs ejs-locals express hiredis redis passport passport.socketio passport-local socket.io sqlite3 connect-redis
(Next install GPIO-Admin to handle the administrator rights needed to control the GPIO pins)
git clone git://github.com/quick2wire/quick2wire-gpio-admin
cd quick2wire-gpio-admin
make
sudo make install
sudo adduser pi gpio
Then I logged out and back in.
npm install pi-gpio
sudo npm install forever -g
(The next command will forward port 80 requests to port 8080, this avoids the need to run node as root to use port 80)
sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080
(Finally run the application)
node app.js
