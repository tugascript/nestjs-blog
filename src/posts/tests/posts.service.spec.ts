import { faker } from '@faker-js/faker';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/sqlite';
import { CacheModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { v4 as uuidV4 } from 'uuid';
import { CommonModule } from '../../common/common.module';
import { CommonService } from '../../common/common.service';
import { QueryCursorEnum } from '../../common/enums/query-cursor.enum';
import { QueryOrderEnum } from '../../common/enums/query-order.enum';
import { LocalMessageType } from '../../common/gql-types/message.type';
import { fakeName, MockPubSub, picture } from '../../common/tests/mocks';
import { config } from '../../config/config';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { validationSchema } from '../../config/validation';
import { NotificationsModule } from '../../notifications/notifications.module';
import { SeriesModule } from '../../series/series.module';
import { SeriesService } from '../../series/series.service';
import { TagsModule } from '../../tags/tags.module';
import { TagsService } from '../../tags/tags.service';
import { UploaderModule } from '../../uploader/uploader.module';
import { UserEntity } from '../../users/entities/user.entity';
import { UsersModule } from '../../users/users.module';
import { PostLikeEntity } from '../entities/post-like.entity';
import { PostTagEntity } from '../entities/post-tag.entity';
import { PostEntity } from '../entities/post.entity';
import { PostsService } from '../posts.service';

const pubsub = new MockPubSub();
describe('PostsService', () => {
  let postsService: PostsService,
    commonService: CommonService,
    tagsService: TagsService,
    seriesService: SeriesService,
    postsRepository: EntityRepository<PostEntity>,
    postLikesRepository: EntityRepository<PostLikeEntity>,
    postTagsRepository: EntityRepository<PostTagEntity>,
    usersRepository: EntityRepository<UserEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema,
          load: [config],
        }),
        CacheModule.register({
          isGlobal: true,
          ttl: parseInt(process.env.REDIS_CACHE_TTL, 10),
        }),
        MikroOrmModule.forRootAsync({
          imports: [ConfigModule],
          useClass: MikroOrmConfig,
        }),
        MikroOrmModule.forFeature([
          PostEntity,
          PostLikeEntity,
          PostTagEntity,
          UserEntity,
        ]),
        TagsModule,
        SeriesModule,
        CommonModule,
        UploaderModule,
        UsersModule,
        NotificationsModule,
      ],
      providers: [
        PostsService,
        {
          provide: 'CommonModule',
          useClass: CommonModule,
        },
        {
          provide: 'UploaderModule',
          useClass: UploaderModule,
        },
      ],
    }).compile();

    postsService = module.get<PostsService>(PostsService);
    commonService = module.get<CommonService>(CommonService);
    tagsService = module.get<TagsService>(TagsService);
    seriesService = module.get<SeriesService>(SeriesService);
    postsRepository = module.get<EntityRepository<PostEntity>>(
      getRepositoryToken(PostEntity),
    );
    postLikesRepository = module.get<EntityRepository<PostLikeEntity>>(
      getRepositoryToken(PostLikeEntity),
    );
    postTagsRepository = module.get<EntityRepository<PostTagEntity>>(
      getRepositoryToken(PostTagEntity),
    );
    usersRepository = module.get<EntityRepository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
  });

  let userId: number;
  describe('User creation', () => {
    it('should create a new user', async () => {
      const name = faker.name.findName();
      const user = usersRepository.create({
        name,
        email: faker.internet.email(),
        username: commonService.generatePointSlug(name),
        password: await hash('Ab123456', 10),
        confirmed: true,
      });
      await usersRepository.persistAndFlush(user);
      userId = user.id;
    });
  });

  describe('Posts CRUD', () => {
    let postId: number;
    it('Create a Post', async () => {
      const tagIds: number[] = [];

      for (let i = 0; i < 5; i++) {
        const name = fakeName();
        const tag = await tagsService.createTag(userId, name);
        tagIds.push(tag.id);
      }

      const title = fakeName();
      const post = await postsService.createPost(userId, {
        title,
        picture: picture(),
        tagIds,
        content: faker.lorem.paragraphs(2),
      });
      expect(post).toBeInstanceOf(PostEntity);
      expect(post.title).toBe(commonService.formatTitle(title));
      postId = post.id;
      await expect(
        postsService.createPost(userId, {
          title,
          picture: picture(),
          tagIds,
          content: faker.lorem.paragraphs(2),
        }),
      ).rejects.toThrowError();
    });

    let postSlug: string;
    it('Update Post', async () => {
      const post = await postsService.postById(postId);
      const oldTitle = post.title;
      const title = fakeName();
      const updatedSeries = await postsService.updatePost(userId, {
        postId,
        title,
        content: faker.lorem.paragraphs(2),
      });
      expect(updatedSeries).toBeInstanceOf(PostEntity);
      expect(updatedSeries.title).not.toStrictEqual(oldTitle);
      expect(updatedSeries.title).toBe(commonService.formatTitle(title));
      postSlug = updatedSeries.slug;
    });

    it('Update Post Picture', async () => {
      const post = await postsService.postById(postId);
      const oldPicture = post.picture;
      const updatedSeries = await postsService.updatePostPicture(userId, {
        postId,
        picture: picture(),
      });
      expect(updatedSeries.picture).not.toStrictEqual(oldPicture);
    });

    let tagId: number;
    it('Add Tag to Post', async () => {
      const post = await postsRepository.findOne(
        { author: userId, id: postId },
        { populate: ['tags'] },
      );
      const postTagsLen = post.tags.count();
      const tag = await tagsService.createTag(
        userId,
        `${faker.name.findName()} ${uuidV4().substring(0, 4)}`,
      );
      tagId = tag.id;
      const updatedPost = await postsService.addTagToPost(userId, {
        postId,
        tagId,
      });
      const updatedTagsLen = await updatedPost.tags.loadCount();
      expect(postTagsLen).toBeLessThan(updatedTagsLen);
      await expect(
        postsService.addTagToPost(userId, {
          postId,
          tagId,
        }),
      ).rejects.toThrowError();
    });

    it('Remove Tag from Post', async () => {
      const post = await postsRepository.findOne(
        { author: userId, id: postId },
        { populate: ['tags'] },
      );
      const postTagsLen = post.tags.count();
      const updatedPost = await postsService.removeTagFromPost(userId, {
        postId,
        tagId,
      });
      const updatedTagsLen = await updatedPost.tags.loadCount();
      expect(postTagsLen).toBeGreaterThan(updatedTagsLen);
    });

    it('Like Post', async () => {
      const post = await postsService.postById(postId);
      expect(await post.likes.loadCount()).toBe(0);
      const updatedPost = await postsService.likePost(pubsub, userId, postId);
      expect(await updatedPost.likes.loadCount(true)).toBe(1);
      await expect(
        postsService.likePost(pubsub, userId, postId),
      ).rejects.toThrowError();
    });

    it('Unlike Post', async () => {
      const post = await postsService.postById(postId);
      expect(await post.likes.loadCount()).toBe(1);
      const updatedPost = await postsService.unlikePost(pubsub, userId, postId);
      expect(await updatedPost.likes.loadCount(true)).toBe(0);
      await expect(
        postsService.unlikePost(pubsub, userId, postId),
      ).rejects.toThrowError();
    });

    it('Post by ID', async () => {
      const post = await postsService.postById(postId);
      expect(post).toBeInstanceOf(PostEntity);
      expect(post.id).toBe(postId);
    });

    it('Post by Slug', async () => {
      const post = await postsService.postBySlug(postSlug);
      expect(post).toBeInstanceOf(PostEntity);
      expect(post.slug).toBe(postSlug);
    });

    const tagIds: number[] = [];
    it('Filter Posts', async () => {
      for (let i = 0; i < 5; i++) {
        const name = fakeName();
        const tag = await tagsService.createTag(userId, name);
        tagIds.push(tag.id);
      }

      const post = await postsService.postById(postId);
      const picture = post.picture;
      const postsArr: PostEntity[] = [];

      for (let i = 0; i < 15; i++) {
        const title = commonService.formatTitle(fakeName());
        postsArr.push(
          postsRepository.create({
            title,
            picture,
            slug: commonService.generateSlug(title),
            content: faker.lorem.paragraphs(2),
            author: userId,
          }),
        );
      }

      await postsRepository.persistAndFlush(postsArr);
      const postTags: PostTagEntity[] = [];

      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 5; j++) {
          postTags.push(
            postTagsRepository.create({
              post: postsArr[i],
              tag: tagIds[j],
            }),
          );
        }
      }

      await postTagsRepository.persistAndFlush(postTags);
      const filteredPosts = await postsService.filterPosts({
        cursor: QueryCursorEnum.DATE,
        order: QueryOrderEnum.DESC,
        first: 10,
        authorId: userId,
      });
      expect(filteredPosts.edges.length).toBe(10);
      expect(filteredPosts.currentCount).toBe(16);
      expect(filteredPosts.previousCount).toBe(0);
      expect(filteredPosts.pageInfo.hasNextPage).toBe(true);
      expect(filteredPosts.pageInfo.hasPreviousPage).toBe(false);

      const filteredPosts2 = await postsService.filterPosts({
        cursor: QueryCursorEnum.DATE,
        order: QueryOrderEnum.DESC,
        first: 10,
        after: filteredPosts.pageInfo.endCursor,
        authorId: userId,
      });
      expect(filteredPosts2.edges.length).toBe(6);
      expect(filteredPosts2.currentCount).toBe(6);
      expect(filteredPosts2.previousCount).toBe(10);
      expect(filteredPosts2.pageInfo.hasNextPage).toBe(false);
      expect(filteredPosts2.pageInfo.hasPreviousPage).toBe(true);
    });

    it('Filter Series Posts', async () => {
      const series = await seriesService.createSeries(userId, {
        title: fakeName(),
        picture: picture(),
        tagIds,
        description: faker.lorem.words(2),
      });
      const filteredPosts = await postsService.filterSeriesPosts({
        seriesId: series.id,
        cursor: QueryCursorEnum.ALPHA,
        order: QueryOrderEnum.ASC,
        first: 4,
      });

      expect(filteredPosts.edges.length).toBe(4);
      expect(filteredPosts.currentCount).toBe(9);
      expect(filteredPosts.previousCount).toBe(0);
      expect(filteredPosts.pageInfo.hasNextPage).toBe(true);
      expect(filteredPosts.pageInfo.hasPreviousPage).toBe(false);

      const filteredPosts2 = await postsService.filterSeriesPosts({
        seriesId: series.id,
        cursor: QueryCursorEnum.ALPHA,
        order: QueryOrderEnum.ASC,
        first: 5,
        after: filteredPosts.pageInfo.endCursor,
      });

      expect(filteredPosts2.edges.length).toBe(5);
      expect(filteredPosts2.currentCount).toBe(5);
      expect(filteredPosts2.previousCount).toBe(4);
      expect(filteredPosts2.pageInfo.hasNextPage).toBe(false);
      expect(filteredPosts2.pageInfo.hasPreviousPage).toBe(true);
    });

    it('Get Post Tags', async () => {
      const tags = await postsService.postTags(postId);
      expect(tags.length).toBe(5);
    });

    it('Get Post Likes', async () => {
      const users: UserEntity[] = [];

      for (let i = 0; i < 5; i++) {
        const name = faker.name.findName();
        users.push(
          usersRepository.create({
            name,
            email: faker.internet.email(),
            username: commonService.generatePointSlug(name),
            password: await hash('Ab123456', 10),
            confirmed: true,
          }),
        );
      }

      await usersRepository.persistAndFlush(users);
      const likes: PostLikeEntity[] = [];

      for (let i = 0; i < 5; i++) {
        likes.push(
          postLikesRepository.create({
            user: users[i],
            post: postId,
          }),
        );
      }

      await postLikesRepository.persistAndFlush(likes);

      const filteredUsers = await postsService.postLikes({
        postId,
        first: 2,
        order: QueryOrderEnum.ASC,
      });
      expect(filteredUsers.edges.length).toBe(2);
      expect(filteredUsers.currentCount).toBe(5);
      expect(filteredUsers.previousCount).toBe(0);
      expect(filteredUsers.pageInfo.hasNextPage).toBe(true);
      expect(filteredUsers.pageInfo.hasPreviousPage).toBe(false);

      const filteredUsers2 = await postsService.postLikes({
        postId,
        first: 3,
        order: QueryOrderEnum.ASC,
        after: filteredUsers.pageInfo.endCursor,
      });
      expect(filteredUsers2.edges.length).toBe(3);
      expect(filteredUsers2.currentCount).toBe(3);
      expect(filteredUsers2.previousCount).toBe(2);
      expect(filteredUsers2.pageInfo.hasNextPage).toBe(false);
      expect(filteredUsers2.pageInfo.hasPreviousPage).toBe(true);
    });

    it('Delete Post', async () => {
      const message = await postsService.deletePost(userId, postId);
      expect(message).toBeInstanceOf(LocalMessageType);
      expect(message.message).toBe('Post deleted successfully');
      await expect(postsService.postById(postId)).rejects.toThrowError();
    });
  });

  it('should be defined', () => {
    expect(postsService).toBeDefined();
    expect(commonService).toBeDefined();
    expect(tagsService).toBeDefined();
    expect(seriesService).toBeDefined();
    expect(postsRepository).toBeDefined();
    expect(postLikesRepository).toBeDefined();
    expect(postTagsRepository).toBeDefined();
    expect(usersRepository).toBeDefined();
  });
});
