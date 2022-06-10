import { Test, TestingModule } from '@nestjs/testing';
import { RepliesService } from '../replies.service';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from '../../config/validation';
import { config } from '../../config/config';
import { CacheModule } from '@nestjs/common';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { ReplyEntity } from '../entities/reply.entity';
import { ReplyLikeEntity } from '../entities/reply-like.entity';
import { CommonModule } from '../../common/common.module';
import { UploaderModule } from '../../uploader/uploader.module';
import { CommentsModule } from '../../comments/comments.module';
import { UserEntity } from '../../users/entities/user.entity';
import { CommentsService } from '../../comments/comments.service';
import { EntityRepository } from '@mikro-orm/sqlite';
import { NotificationsModule } from '../../notifications/notifications.module';
import { fakeName, MockPubSub, picture } from '../../common/tests/mocks';
import { faker } from '@faker-js/faker';
import { hash } from 'bcrypt';
import { CommonService } from '../../common/common.service';
import { PostsModule } from '../../posts/posts.module';
import { PostsService } from '../../posts/posts.service';
import { TagsService } from '../../tags/tags.service';
import { TagsModule } from '../../tags/tags.module';
import { PostEntity } from '../../posts/entities/post.entity';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { LocalMessageType } from '../../common/gql-types/message.type';
import { QueryOrderEnum } from '../../common/enums/query-order.enum';

const pubsub = new MockPubSub();
describe('RepliesService', () => {
  let repliesService: RepliesService,
    commentsService: CommentsService,
    commonService: CommonService,
    postsService: PostsService,
    tagsService: TagsService,
    repliesRepository: EntityRepository<ReplyEntity>,
    repliesLikeRepository: EntityRepository<ReplyLikeEntity>,
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
        MikroOrmModule.forFeature([ReplyEntity, ReplyLikeEntity, UserEntity]),
        CommonModule,
        UploaderModule,
        CommentsModule,
        PostsModule,
        TagsModule,
        NotificationsModule,
      ],
      providers: [
        RepliesService,
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

    repliesService = module.get<RepliesService>(RepliesService);
    commentsService = module.get<CommentsService>(CommentsService);
    commonService = module.get<CommonService>(CommonService);
    postsService = module.get<PostsService>(PostsService);
    tagsService = module.get<TagsService>(TagsService);
    repliesRepository = module.get<EntityRepository<ReplyEntity>>(
      getRepositoryToken(ReplyEntity),
    );
    repliesLikeRepository = module.get<EntityRepository<ReplyLikeEntity>>(
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

  describe('Replies CRUD', () => {
    let commentId: number;
    let replyId: number;
    it('Create Reply', async () => {
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

      const comment = await commentsService.createComment(pubsub, userId, {
        postId: post.id,
        content: faker.lorem.words(2),
      });
      await expect(comment).toBeInstanceOf(CommentEntity);
      commentId = comment.id;

      const reply = await repliesService.createReply(pubsub, userId, {
        commentId,
        content: faker.lorem.words(2),
      });
      expect(reply).toBeInstanceOf(ReplyEntity);
      expect(reply.mention).toBeUndefined();
      replyId = reply.id;

      const reply2 = await repliesService.createReply(pubsub, userId, {
        commentId,
        content: faker.lorem.words(2),
        replyId: reply.id,
      });
      expect(reply2).toBeInstanceOf(ReplyEntity);
      expect(reply2.mention.id).toBe(reply.author.id);
    });

    it('Update Reply', async () => {
      const content = faker.lorem.words(2);
      const reply = await repliesService.updateReply(pubsub, userId, {
        commentId,
        replyId,
        content,
      });
      expect(reply.content).toBe(content);
    });

    it('Like Reply', async () => {
      const reply = await repliesRepository.findOne({
        comment: commentId,
        id: replyId,
      });
      expect(await reply.likes.loadCount()).toBe(0);
      const updatedReply = await repliesService.likeReply(pubsub, userId, {
        commentId,
        replyId,
      });
      expect(await updatedReply.likes.loadCount(true)).toBe(1);
      await expect(
        repliesService.likeReply(pubsub, userId, {
          commentId,
          replyId,
        }),
      ).rejects.toThrowError();
    });

    it('Unlike Reply', async () => {
      const reply = await repliesRepository.findOne({
        comment: commentId,
        id: replyId,
      });
      expect(await reply.likes.loadCount()).toBe(1);
      const updatedReply = await repliesService.unlikeReply(pubsub, userId, {
        commentId,
        replyId,
      });
      expect(await updatedReply.likes.loadCount(true)).toBe(0);
      await expect(
        repliesService.unlikeReply(pubsub, userId, { commentId, replyId }),
      ).rejects.toThrowError();
    });

    it('Delete Reply', async () => {
      const message = await repliesService.deleteReply(pubsub, userId, {
        commentId,
        replyId,
      });
      expect(message).toBeInstanceOf(LocalMessageType);
      expect(message.message).toBe('Reply deleted successfully');
      expect(
        await repliesRepository.findOne({ id: replyId, comment: commentId }),
      ).toBeNull();
    });

    it('Filter Comments', async () => {
      const comment = await commentsService.commentById(commentId);
      const replies: ReplyEntity[] = [];

      for (let i = 0; i < 10; i++) {
        replies.push(
          repliesRepository.create({
            comment: commentId,
            post: comment.post.id,
            author: userId,
            content: faker.lorem.words(2),
          }),
        );
      }

      await repliesRepository.persistAndFlush(replies);
      const filteredReplies = await repliesService.filterReplies({
        commentId,
        order: QueryOrderEnum.DESC,
        first: 4,
      });
      expect(filteredReplies.edges.length).toBe(4);
      expect(filteredReplies.currentCount).toBe(11);
      expect(filteredReplies.previousCount).toBe(0);
      expect(filteredReplies.pageInfo.hasNextPage).toBe(true);
      expect(filteredReplies.pageInfo.hasPreviousPage).toBe(false);

      const filteredReplies2 = await repliesService.filterReplies({
        commentId,
        order: QueryOrderEnum.DESC,
        first: 4,
        after: filteredReplies.pageInfo.endCursor,
      });
      expect(filteredReplies2.edges.length).toBe(4);
      expect(filteredReplies2.currentCount).toBe(7);
      expect(filteredReplies2.previousCount).toBe(4);
      expect(filteredReplies2.pageInfo.hasNextPage).toBe(true);
      expect(filteredReplies2.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  it('should be defined', () => {
    expect(repliesService).toBeDefined();
    expect(commentsService).toBeDefined();
    expect(commonService).toBeDefined();
    expect(postsService).toBeDefined();
    expect(tagsService).toBeDefined();
    expect(repliesRepository).toBeDefined();
    expect(repliesLikeRepository).toBeDefined();
    expect(usersRepository).toBeDefined();
  });
});
