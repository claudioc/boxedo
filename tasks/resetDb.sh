#!/bin/bash

# Prompt user for confirmation
read -p "This will delete all your database data. Press Y to continue: " -n 1 -r
echo    # move to a new line

exit 0

if [[ $REPLY =~ ^[Yy]$ ]]
then
    # If Y or y is pressed, continue with the operation
    docker compose down && docker volume rm joongle_joongle_data && docker compose up -d
else
    # If the user does not confirm, exit the script
    echo "Operation canceled."
    exit 1
fi
