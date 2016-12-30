#!/bin/bash
#
# This script configures the environment variables like
# Drupal code standards and git configuration.

ENV_SETUP_COMPLETE_FILE=/etc/environment_setup_complete

# Variables used to configure the environment.
CS_PATH="/home/vagrant/.composer/vendor/drupal/coder/coder_sniffer"
STANDARDS_PATH="/home/vagrant/.composer/vendor/squizlabs/php_codesniffer/CodeSniffer/Standards"
USER_NAME="Full Name"
USER_MAIL="youmail@ciandt.com"
VAGRANT_USER="vagrant"

# Check to see if we've already performed this setup.
if [ ! -e "$ENV_SETUP_COMPLETE_FILE" ]; then

  # Update the composer.
  su - $VAGRANT_USER -c "composer global update drupal/coder --prefer-source"

  # Add the coder to global path.
  echo 'export PATH="$PATH:/home/vagrant/.composer/vendor/bin"' >> /home/vagrant/.profile

  # Register the Drupal and DrupalPractice.
  su - $VAGRANT_USER -c "phpcs --config-set installed_paths $CS_PATH"

  # Git config.
  su - $VAGRANT_USER -c "git config --global user.name '$USER_NAME'"
  su - $VAGRANT_USER -c "git config --global user.mail '$USER_MAIL'"
  su - $VAGRANT_USER -c "git config --global merge.tool meld"
  su - $VAGRANT_USER -c "git config --global credential.helper cache"
  su - $VAGRANT_USER -c "git config --global push.default nothing"

  # Create a file to indicate this script has already run.
  sudo touch $ENV_SETUP_COMPLETE_FILE
else
  exit 0
fi
