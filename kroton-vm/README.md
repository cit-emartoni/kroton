## Kroton VM

This project is based from the original one [Drupal VM](https://www.drupalvm.com/).

## VM info

This virtual machine will install the Lightning distro using Drupal 7 and Bootstrap theme.

## System Requirements

Kroton VM runs on almost any modern computer that can run VirtualBox and Vagrant, however for the best out-of-the-box experience, it's recommended you have a computer with at least:

  - Intel Core processor with VT-x enabled
  - At least 4 GB RAM (higher is better)
  - An SSD (for greater speed with synced folders)
  
## Other Notes
  
  
  - To start the virutal machine, enter `vagrant up` in the Terminal in the same folder that has the `Vagrantfile`.
  - To shut down the virtual machine, enter `vagrant halt` in the Terminal in the same folder that has the `Vagrantfile`. To destroy it completely (if you want to save a little disk space, or want to rebuild it from scratch with `vagrant up` again), type in `vagrant destroy`.
  - To log into the virtual machine, enter `vagrant ssh`. You can also get the machine's SSH connection details with `vagrant ssh-config`.
  - When you rebuild the VM (e.g. `vagrant destroy` and then another `vagrant up`), make sure you clear out the contents of the `drupal` folder on your host machine, or Drupal will return some errors when the VM is rebuilt (it won't reinstall Drupal cleanly).
  - You can change the installed version of Drupal or drush, or any other configuration options, by editing the variables within `config.yml`.
