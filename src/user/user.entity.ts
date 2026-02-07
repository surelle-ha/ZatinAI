import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn, DeleteDateColumn, BeforeUpdate, BeforeInsert } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: false, default: '--' })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: false, default: '--' })
  lastName: string;

  @Column({ name: 'gender', type: 'varchar', length: 255, nullable: false, default: '--' })
  gender: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: false, default: '--' })
  phone: string;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: false, default: '--' })
  address: string;

  @Column({ name: 'city', type: 'varchar', length: 255, nullable: false, default: '--' })
  city: string;

  @Column({ name: 'state', type: 'varchar', length: 255, nullable: false, default: '--' })
  state: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: false, default: '--' })
  postalCode: string;

  @Column({ name: 'country', type: 'varchar', length: 255, nullable: false, default: '--' })
  country: string;

  @Column({ name: 'email', type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ name: 'username', type: 'varchar', length: 255, unique: true, nullable: false })
  username: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ name: 'is_email_verified', type: 'boolean', nullable: false, default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', type: 'boolean', nullable: false, default: false })
  isPhoneVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }
}
