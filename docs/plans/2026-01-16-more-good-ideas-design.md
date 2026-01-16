<section name="problem">Ability for user to manage topics and ideas. A topic has many ideas. Topic fields: name, description, tags. Idea fields: name, description, tags, feedback.</section>

<section name="findings">
- Topic management should support creating, editing, deleting, and archiving topics.
- Idea management should support creating, editing, deleting, moving between topics, and archiving ideas.
- Tags should be stored as a structured list (e.g., join table), and feedback should include a numeric rating from 1–5 plus optional text.
</section>

<section name="recommendation">Implement CRUD workflows for topics and ideas, including archive and move actions. Model tags as a normalized list per entity, and add feedback as rating + optional notes for each idea.</section>
