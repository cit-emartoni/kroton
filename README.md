# Kroton Project

## Directory structure:
- **code**: Drupal source code.
- **db**: Drupal database dump (when import database is needed).
- **kroton-vm**: Vagrant source used to bring the VM.

## How to install:
- Download and install [VirtualBox](https://www.virtualbox.org) for your operation system (Linux or Windows).
- Download and install [Vagrant](https://www.vagrantup.com) for your operation system (Linux or Windows).
- For **linux users**, download and install NFS with command: **sudo apt-get install nfs-kernel-server**.
- Clone this repository and edit the file **config.yml** to set the right path.
- Inside the Vagrant directory (kroton-vm), run **vagrant up** and drink some coffee.
- Add the following line to the hosts file: **10.0.1.10 kroton.local**.

## Documentation:
Documentation can be found [here](https://docs.google.com/document/d/1bmxM7fB9P__knvZXdLMMhRCwjwK5eyKMv3snj3D7PZk/).

## ￼Troubleshooting
For any troubleshooting during the process, please read the [documentation](https://docs.google.com/document/d/1bmxM7fB9P__knvZXdLMMhRCwjwK5eyKMv3snj3D7PZk/#heading=h.s7qzzz7bscbd).
