import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Workspace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_name', type: 'varchar', length: 255, unique: true, nullable: false })
  publicName: string;

  @Column({ name: 'private_name', type: 'varchar', length: 255, unique: true, nullable: false })
  privateName: string;

  @Column({ name: 'description', type: 'text', nullable: false, default: '--' })
  description: string;

  @Column({ name: 'is_enabled', type: 'boolean', nullable: false, default: true })
  isEnabled: boolean;

  @Column({ name: 'is_property', type: 'boolean', nullable: false, default: false })
  isProperty: boolean;

  @Column({ name: 'owned_by', type: 'int', nullable: false })
  ownedBy: number;

  @Column({ name: 'created_by', type: 'int', nullable: false })
  createdBy: number;
}
