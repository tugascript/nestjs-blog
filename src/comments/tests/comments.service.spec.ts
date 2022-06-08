import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from '../comments.service';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from '../../config/validation';
import { config } from '../../config/config';
import { CacheModule } from '@nestjs/common';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { CommentEntity } from '../entities/comment.entity';
import { CommentLikeEntity } from '../entities/comment-like.entity';
import { ReplyEntity } from '../entities/reply.entity';
import { ReplyLikeEntity } from '../entities/reply-like.entity';
import { CommonModule } from '../../common/common.module';
import { UploaderModule } from '../../uploader/uploader.module';
import { PostsModule } from '../../posts/posts.module';
import { UsersModule } from '../../users/users.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { PostsService } from '../../posts/posts.service';
import { CommonService } from '../../common/common.service';
import { EntityRepository } from '@mikro-orm/sqlite';
import { faker } from '@faker-js/faker';
import { hash } from 'bcrypt';
import { UserEntity } from '../../users/entities/user.entity';
import { fakeName, MockPubSub, picture } from '../../common/tests/mocks.spec';
import { TagsModule } from '../../tags/tags.module';
import { TagsService } from '../../tags/tags.service';
import { PostEntity } from '../../posts/entities/post.entity';
import { LocalMessageType } from '../../common/gql-types/message.type';
import { QueryOrderEnum } from '../../common/enums/query-order.enum';

const pubsub = new MockPubSub();
describe('CommentsService', () => {
  let commentsService: CommentsService,
    postsService: PostsService,
    commonService: CommonService,
    tagsService: TagsService,
    commentsRepository: EntityRepository<CommentEntity>,
    commentLikesRepository: EntityRepository<CommentLikeEntity>,
    repliesRepository: EntityRepository<ReplyEntity>,
    replyLikesRepository: EntityRepository<ReplyLikeEntity>,
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
          CommentEntity,
          CommentLikeEntity,
          ReplyEntity,
          ReplyLikeEntity,
        ]),
        CommonModule,
        UploaderModule,
        PostsModule,
        UsersModule,
        NotificationsModule,
        TagsModule,
      ],
      providers: [
        CommentsService,
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

    commentsService = module.get<CommentsService>(CommentsService);
    postsService = module.get<PostsService>(PostsService);
    commonService = module.get<CommonService>(CommonService);
    tagsService = module.get<TagsService>(TagsService);
    commentsRepository = module.get<EntityRepository<CommentEntity>>(
      getRepositoryToken(CommentEntity),
    );
    commentLikesRepository = module.get<EntityRepository<CommentLikeEntity>>(
      getRepositoryToken(CommentLikeEntity),
    );
    repliesRepository = module.get<EntityRepository<ReplyEntity>>(
      getRepositoryToken(ReplyEntity),
    );
    replyLikesRepository = module.get<EntityRepository<ReplyLikeEntity>>(
      getRepositoryToken(ReplyLikeEntity),
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

  let commentId: number;
  describe('Comment CRUD', () => {
    let postId: number;
    it('Create Comment', async () => {
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

      const comment = await commentsService.createComment(pubsub, userId, {
        postId,
        content: faker.lorem.words(2),
      });
      await expect(comment).toBeInstanceOf(CommentEntity);
      commentId = comment.id;
    });

    it('Update Comment', async () => {
      const comment = await commentsRepository.findOne({ id: commentId });
      const oldBody = comment.content;

      const updateComment = await commentsService.updateComment(
        pubsub,
        userId,
        {
          commentId,
          content: faker.lorem.words(2),
        },
      );
      expect(updateComment).toBeInstanceOf(CommentEntity);
      expect(updateComment.content).not.toBe(oldBody);
    });

    it('Like Comment', async () => {
      const comment = await commentsRepository.findOne({ id: commentId });
      expect(await comment.likes.loadCount()).toBe(0);
      const updatedComment = await commentsService.likeComment(
        pubsub,
        userId,
        commentId,
      );
      expect(await updatedComment.likes.loadCount(true)).toBe(1);
      await expect(
        commentsService.likeComment(pubsub, userId, commentId),
      ).rejects.toThrowError();
    });

    it('Unlike Comment', async () => {
      const comment = await commentsRepository.findOne({ id: commentId });
      expect(await comment.likes.loadCount()).toBe(1);
      const updatedComment = await commentsService.unlikeComment(
        pubsub,
        userId,
        commentId,
      );
      expect(await updatedComment.likes.loadCount(true)).toBe(0);
      await expect(
        commentsService.unlikeComment(pubsub, userId, commentId),
      ).rejects.toThrowError();
    });

    it('Delete Comment', async () => {
      const message = await commentsService.deleteComment(
        pubsub,
        userId,
        commentId,
      );
      expect(message).toBeInstanceOf(LocalMessageType);
      expect(message.message).toBe('Comment deleted successfully');
    });

    it('Filter Comments', async () => {
      const comments: CommentEntity[] = [];

      for (let i = 0; i < 10; i++) {
        comments.push(
          commentsRepository.create({
            post: postId,
            author: userId,
            content: faker.lorem.words(2),
          }),
        );
      }

      await commentsRepository.persistAndFlush(comments);
      const filteredComments = await commentsService.filterComments({
        postId,
        order: QueryOrderEnum.DESC,
        first: 5,
      });
      expect(filteredComments.edges.length).toBe(5);
      expect(filteredComments.currentCount).toBe(10);
      expect(filteredComments.previousCount).toBe(0);
      expect(filteredComments.pageInfo.hasNextPage).toBe(true);
      expect(filteredComments.pageInfo.hasPreviousPage).toBe(false);

      const filteredComments2 = await commentsService.filterComments({
        postId,
        order: QueryOrderEnum.DESC,
        first: 4,
        after: filteredComments.pageInfo.endCursor,
      });
      expect(filteredComments2.edges.length).toBe(4);
      expect(filteredComments2.currentCount).toBe(5);
      expect(filteredComments2.previousCount).toBe(5);
      expect(filteredComments2.pageInfo.hasNextPage).toBe(true);
      expect(filteredComments2.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  it('should be defined', () => {
    expect(commentsService).toBeDefined();
    expect(postsService).toBeDefined();
    expect(commonService).toBeDefined();
    expect(tagsService).toBeDefined();
    expect(commentsRepository).toBeDefined();
    expect(commentLikesRepository).toBeDefined();
    expect(repliesRepository).toBeDefined();
    expect(replyLikesRepository).toBeDefined();
    expect(usersRepository).toBeDefined();
  });
});
