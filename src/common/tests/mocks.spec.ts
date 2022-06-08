import { PubSub } from 'mercurius';
import { createReadStream } from 'fs';
import { join } from 'path';
import { FileUpload } from 'graphql-upload';
import { faker } from '@faker-js/faker';
import { v4 as uuidV4 } from 'uuid';

export class MockPubSub implements PubSub {
  public publish = jest.fn();
  public subscribe = jest.fn();
}

export const fileStream = () =>
  createReadStream(join(__dirname, '..', '..', '..', 'test/files/test.jpeg'));

const file: FileUpload = {
  createReadStream: () => fileStream(),
  filename: 'test_image',
  mimetype: 'image/jpeg',
  encoding: 'JPEG',
};

export const picture = (): Promise<FileUpload> =>
  new Promise<FileUpload>((resolve) => resolve(file));

export const fakeName = (): string =>
  `${faker.name.findName()} ${uuidV4().substring(0, 4)}`;
