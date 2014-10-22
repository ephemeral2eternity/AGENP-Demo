# agenp.js

An AGENP-DEMO page for agent based resource provisioning in Cloud based VoD.
Video Player: dash.js

## Quick Start

Download 'master' or latest tagged release, extract and open main folder dash.js/index.html in your web browser to view the main test file.

### Install Dependencies
1. [install nodejs](http://nodejs.org/)
2. [install grunt](http://gruntjs.com/getting-started)
    * npm install -g grunt-cli
3. [install grunt-template-jasmine-istanbul](https://github.com/maenu/grunt-template-jasmine-istanbul)
    * npm install grunt-template-jasmine-istanbul --save-dev
4. install some other dependencies:
    * npm install grunt-contrib-connect grunt-contrib-watch grunt-contrib-jshint grunt-contrib-uglify
5. Build/Run dash.js
	* grunt --config Gruntfile.js --force

### Get the DASH Videos
6. http://dash.edgesuite.net/dash264/TestCases/2c/qualcomm/2/

### Set up an apache2 server on your VM
7. Installing git and apache2
	* sudo apt-get install git
	* sudo apt-get install apache2 apache2-doc apache2-utils
	* sudo apt-get install libapache2-mod-python

8. Change the web server folder to the denoted folder.
	* Disable default site: /usr/sbin/a2dissite default
	* sudo cp /etc/apache2/sites-available/default /etc/apache2/sites-available/site-name
	* vi /etc/apache2/sites-available/site-name
	* Change Document Root to /path-to-your-foler/
	* Change Directory to /path-to-your-folder/
	* Enable new site: /usr/sbin/a2ensite site-name
	* In case you are in ubuntu: Add following lines in /etc/apache2/apache2.conf
<Directory /path-to-your-folder/>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
</Directory>
	* Restart apache: sudo /etc/init.d/apache2 restart
	* Reload site-name website: sudo /etc/init.d/apache2 reload


```
```
