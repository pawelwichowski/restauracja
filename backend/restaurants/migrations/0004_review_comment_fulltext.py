from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("restaurants", "0003_review"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "CREATE FULLTEXT INDEX review_comment_fulltext "
                "ON restaurants_review (comment)"
            ),
            reverse_sql="DROP INDEX review_comment_fulltext ON restaurants_review",
        ),
    ]
