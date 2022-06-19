# NestJS GraphQL Blog Back-End

## Description

The back-end of my personal blog made with NestJS & GraphQL.

## Architecture

This project is divided into three main entities/classes:

* **Users**: the users of the blog, which are divided into admins, publishers and normal users.
* **Posts**: the posts of the blog.
* **Series**: the series of a given group of blog posts.
* **Comments**: the comments, or user interaction with the blog posts.

The posts are related to the series by a many-to-many-to-many relationship, with tags as an intermediate
table.
It follows a team blog approach were there can be multiple publishers and admins, so it's perfect for a team
as well as a single individual.
In terms of table relationships apart from some exceptions they are loaded by dataloaders, even the paginated
relationships.

## Installation

```bash
$ yarn install
```

## Database Migrations

```bash
# creation
$ yarn migrate:create
# update
$ yarn migrate:update
```

## Running the app

```bash
# production mode
$ yarn start

# watch mode
$ yarn start:dev

# debug mode
$ yarn start:debug
```

## Unit Testing

### BEFORE EACH TEST (Individual or All):

- Check if NODE_ENV is not production
- Remove the current test.db
- Create a new test.db

```bash
# remove test.db
$ rm test.db
# create a new test.db
$ yarn migrate:create
```

### All tests:

```bash
# unit tests
$ yarn run test  --detectOpenHandles
```

### Individual test:

```bash
# unit tests
$ yarn run test service-name.service.spec.ts --detectOpenHandles
```

## License

This project is [GNU GPLv3 licensed](LICENSE).
