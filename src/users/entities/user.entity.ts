/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Collection,
  Embedded,
  Entity,
  Enum,
  OneToMany,
  OptionalProps,
  Property,
} from '@mikro-orm/core';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import { CommentLikeEntity } from '../../comments/entities/comment-like.entity';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { NAME_REGEX, SLUG_REGEX } from '../../common/constants/regex';
import { LocalBaseEntity } from '../../common/entities/base.entity';
import { PostLikeEntity } from '../../posts/entities/post-like.entity';
import { PostEntity } from '../../posts/entities/post.entity';
import { ReplyEntity } from '../../replies/entities/reply.entity';
import { SeriesFollowerEntity } from '../../series/entities/series-follower.entity';
import { CredentialsEmbeddable } from '../embeddables/credentials.embeddable';
import { OnlineStatusEnum } from '../enums/online-status.enum';
import { RoleEnum } from '../enums/role.enum';
import { IUser } from '../interfaces/user.interface';

@Entity({ tableName: 'users' })
export class UserEntity extends LocalBaseEntity implements IUser {
  [OptionalProps]?:
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'picture'
    | 'onlineStatus'
    | 'defaultStatus'
    | 'confirmed'
    | 'suspended'
    | 'twoFactor'
    | 'credentials'
    | 'lastLogin'
    | 'lastOnline';

  @Property({ columnType: 'varchar(100)' })
  @IsString()
  @Length(3, 100)
  @Matches(NAME_REGEX)
  public name!: string;

  @Property({ columnType: 'varchar(110)', unique: true })
  @IsString()
  @Length(3, 110)
  @Matches(SLUG_REGEX)
  public username!: string;

  @Property({ columnType: 'varchar(255)', unique: true })
  @IsEmail()
  public email!: string;

  @Property({ columnType: 'varchar(255)', nullable: true })
  @IsOptional()
  @IsUrl()
  public picture?: string;

  @Property()
  @IsString()
  public password!: string;

  @Enum({
    items: () => RoleEnum,
    default: RoleEnum.USER,
    columnType: 'varchar(9)',
  })
  @IsEnum(RoleEnum)
  public role: RoleEnum = RoleEnum.USER;

  @Enum({
    items: () => OnlineStatusEnum,
    default: OnlineStatusEnum.OFFLINE,
    columnType: 'varchar(14)',
  })
  @IsEnum(OnlineStatusEnum)
  public onlineStatus: OnlineStatusEnum = OnlineStatusEnum.OFFLINE;

  @Enum({
    items: () => OnlineStatusEnum,
    default: OnlineStatusEnum.ONLINE,
    columnType: 'varchar(14)',
  })
  @IsEnum(OnlineStatusEnum)
  public defaultStatus: OnlineStatusEnum = OnlineStatusEnum.ONLINE;

  @Property({ default: false })
  @IsBoolean()
  public confirmed: boolean = false;

  @Property({ default: false })
  @IsBoolean()
  public suspended: boolean = false;

  @Property({ default: false })
  @IsBoolean()
  public twoFactor: boolean = false;

  @Embedded(() => CredentialsEmbeddable)
  public credentials: CredentialsEmbeddable = new CredentialsEmbeddable();

  @Property()
  @IsDate()
  public lastLogin: Date = new Date();

  @Property()
  @IsDate()
  public lastOnline: Date = new Date();

  @OneToMany(() => PostLikeEntity, (l) => l.user)
  public likedPosts: Collection<PostLikeEntity, UserEntity> = new Collection<
    PostLikeEntity,
    UserEntity
  >(this);

  @OneToMany(() => SeriesFollowerEntity, (f) => f.user)
  public followedSeries: Collection<SeriesFollowerEntity, UserEntity> =
    new Collection<SeriesFollowerEntity, UserEntity>(this);

  @OneToMany(() => CommentLikeEntity, (l) => l.user)
  public likedComments: Collection<CommentLikeEntity, UserEntity> =
    new Collection<CommentLikeEntity, UserEntity>(this);

  @OneToMany(() => PostEntity, (p) => p.author)
  public writtenPosts: Collection<PostEntity, UserEntity> = new Collection<
    PostEntity,
    UserEntity
  >(this);

  @OneToMany(() => CommentEntity, (c) => c.author)
  public writtenComments: Collection<CommentEntity, UserEntity> =
    new Collection<CommentEntity, UserEntity>(this);

  @OneToMany(() => ReplyEntity, (r) => r.author)
  public writtenReplies: Collection<ReplyEntity, UserEntity> = new Collection<
    ReplyEntity,
    UserEntity
  >(this);
}
