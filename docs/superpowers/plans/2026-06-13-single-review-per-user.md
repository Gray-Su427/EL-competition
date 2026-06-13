# Single Review Per User Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one active review per user per dish, let repeat reviewers edit their existing review in place, and surface an "已编辑" marker after updates.

**Architecture:** Keep the existing `reviews` table and routes, but harden the backend with a `user_id + dish_id` uniqueness rule plus an update endpoint. Reuse the dish detail page's existing review fetch to detect the current user's review, then run the same `ReviewForm` in create or edit mode with existing-image retention and replacement support.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, pytest, React 19, TypeScript 6, Vite 8

---

## File Map

- Modify: `what_to_eat_today_web/backend/models.py`
  Responsibility: add review uniqueness and edit timestamp to the ORM model.
- Modify: `what_to_eat_today_web/backend/schemas.py`
  Responsibility: expose `updatedAt` to the frontend and keep review payload parsing aligned.
- Modify: `what_to_eat_today_web/backend/routes/reviews.py`
  Responsibility: reject duplicate creates, dedupe existing data, handle review updates, and manage image retention/deletion.
- Create: `what_to_eat_today_web/backend/tests/test_reviews.py`
  Responsibility: cover create conflict, author-only update, image retention, and edit timestamp behavior.
- Modify: `what_to_eat_today_web/frontend/src/types.ts`
  Responsibility: add `updatedAt` to the review type.
- Modify: `what_to_eat_today_web/frontend/src/mock/mockApi.ts`
  Responsibility: add `updateReview()` and normalize review mutation payloads.
- Modify: `what_to_eat_today_web/frontend/src/components/ReviewForm.tsx`
  Responsibility: support create/edit modes, prefill fields, keep old images, and upload replacement images.
- Modify: `what_to_eat_today_web/frontend/src/pages/DishDetailPage.tsx`
  Responsibility: detect the current user's review, switch the CTA to "修改评价", and show the "已编辑" label.
- Modify: `what_to_eat_today_web/frontend/src/styles.css`
  Responsibility: style existing-image chips, edit-state hints, and the edited marker.

### Task 1: Lock Review Uniqueness in the Backend

**Files:**
- Modify: `what_to_eat_today_web/backend/models.py`
- Modify: `what_to_eat_today_web/backend/schemas.py`
- Modify: `what_to_eat_today_web/backend/routes/reviews.py`
- Test: `what_to_eat_today_web/backend/tests/test_reviews.py`

- [ ] **Step 1: Write the failing backend tests for duplicate create and edited metadata**

```python
"""Tests for review create/update constraints."""

from datetime import datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from main import app
from models import Dish, Review, User


@pytest.fixture
def review_test_db(monkeypatch, tmp_path):
    db_file = tmp_path / "reviews-test.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    import routes.reviews as reviews_module
    import routes.auth as auth_module

    monkeypatch.setattr(reviews_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(auth_module, "SessionLocal", TestingSessionLocal)

    db = TestingSessionLocal()
    db.add(User(id=1, email="u1@nju.edu.cn", nickname="测试用户"))
    db.add(User(id=2, email="u2@nju.edu.cn", nickname="别的用户"))
    db.add(
        Dish(
            id="dish-1",
            name="拌牛肉",
            price=16,
            canteen="一食堂",
            window="6号",
            rating=5.0,
            review_count=1,
            tags='["推荐"]',
            heat_status="正常",
            emoji="🥗",
        )
    )
    db.commit()
    db.close()
    return TestingSessionLocal


@pytest.fixture
async def review_client(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        monkeypatch.setattr("routes.reviews.get_current_user_id", lambda: 1)
        yield client


@pytest.mark.asyncio
async def test_duplicate_review_create_returns_409(review_test_db, review_client):
    first = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "5", "content": "第一次"},
    )
    assert first.status_code == 201

    second = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "4", "content": "第二次"},
    )
    assert second.status_code == 409
    assert "已经评价过" in second.json()["detail"]


@pytest.mark.asyncio
async def test_updated_review_returns_updated_at(review_test_db, review_client):
    created = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "5", "content": "原评价"},
    )
    review_id = created.json()["id"]

    updated = await review_client.put(
        f"/api/reviews/{review_id}",
        data={
            "rating": "3",
            "content": "改过了",
            "tags": '["偏贵"]',
            "keep_images": "[]",
        },
    )

    assert updated.status_code == 200
    body = updated.json()
    assert body["content"] == "改过了"
    assert body["updatedAt"] is not None
```

- [ ] **Step 2: Run the review tests to verify they fail before implementation**

Run: `python -m pytest what_to_eat_today_web/backend/tests/test_reviews.py -v`

Expected: FAIL because `PUT /api/reviews/{review_id}` does not exist yet and duplicate create still returns `201`.

- [ ] **Step 3: Add uniqueness and edit timestamp to the review model**

```python
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "dish_id", name="uq_reviews_user_dish"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dish_id = Column(String, ForeignKey("dishes.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)
    images = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, nullable=True)
```

- [ ] **Step 4: Expose `updatedAt` from the response schema**

```python
class ReviewOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: int
    user_id: int
    dish_id: str
    dish_name: str = ""
    dish_emoji: str = ""
    nickname: str = ""
    rating: int
    content: str | None = None
    tags: list[str] = []
    images: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None
```

- [ ] **Step 5: Add startup dedupe and duplicate-create rejection in the review route**

```python
def _dedupe_reviews_for_unique_constraint(db) -> None:
    reviews = (
        db.query(Review)
        .order_by(Review.user_id, Review.dish_id, Review.created_at.desc(), Review.id.desc())
        .all()
    )
    seen: set[tuple[int, str]] = set()
    for review in reviews:
        key = (review.user_id, review.dish_id)
        if key in seen:
            db.delete(review)
            continue
        seen.add(key)
    db.commit()


def _build_review_out(review: Review, db) -> ReviewOut:
    user = db.query(User).filter(User.id == review.user_id).first()
    dish = db.query(Dish).filter(Dish.id == review.dish_id).first()
    return ReviewOut(
        id=review.id,
        user_id=review.user_id,
        dish_id=review.dish_id,
        dish_name=dish.name if dish else "",
        dish_emoji=dish.emoji if dish else "",
        nickname=user.nickname or "匿名用户" if user else "匿名用户",
        rating=review.rating,
        content=review.content,
        tags=review.tags,
        images=review.images,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(...):
    db = SessionLocal()
    try:
        _dedupe_reviews_for_unique_constraint(db)
        existing = (
            db.query(Review)
            .filter(Review.user_id == user_id, Review.dish_id == dish_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="你已经评价过这道菜，请修改之前的评价",
            )
```

- [ ] **Step 6: Run the targeted tests to verify the first half passes**

Run: `python -m pytest what_to_eat_today_web/backend/tests/test_reviews.py::test_duplicate_review_create_returns_409 -v`

Expected: PASS for the duplicate-create case, while the update test still fails because the `PUT` route is not implemented yet.

- [ ] **Step 7: Commit the backend constraint groundwork**

```bash
git add what_to_eat_today_web/backend/models.py what_to_eat_today_web/backend/schemas.py what_to_eat_today_web/backend/routes/reviews.py what_to_eat_today_web/backend/tests/test_reviews.py
git commit -m "feat: enforce one review per user and dish"
```

### Task 2: Add Author-Only Review Editing With Image Retention

**Files:**
- Modify: `what_to_eat_today_web/backend/routes/reviews.py`
- Test: `what_to_eat_today_web/backend/tests/test_reviews.py`

- [ ] **Step 1: Extend the failing tests for update permission and image retention**

```python
@pytest.mark.asyncio
async def test_review_author_can_keep_old_images_and_add_new_one(review_test_db, review_client, tmp_path):
    created = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "5", "content": "原评价"},
    )
    review_id = created.json()["id"]

    # Seed one existing image path directly in DB
    db = review_test_db()
    review = db.query(Review).filter(Review.id == review_id).first()
    review.images = '["/static/uploads/old.jpg"]'
    db.commit()
    db.close()

    updated = await review_client.put(
        f"/api/reviews/{review_id}",
        data={
            "rating": "4",
            "content": "保留旧图并加新图",
            "tags": '["推荐"]',
            "keep_images": '["/static/uploads/old.jpg"]',
        },
        files={"images": ("new.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert updated.status_code == 200
    body = updated.json()
    assert body["images"][0] == "/static/uploads/old.jpg"
    assert len(body["images"]) == 2


@pytest.mark.asyncio
async def test_review_update_forbidden_for_other_user(review_test_db, monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        monkeypatch.setattr("routes.reviews.get_current_user_id", lambda: 1)
        created = await client.post(
            "/api/reviews",
            data={"dish_id": "dish-1", "rating": "5", "content": "原评价"},
        )

    review_id = created.json()["id"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        monkeypatch.setattr("routes.reviews.get_current_user_id", lambda: 2)
        forbidden = await client.put(
            f"/api/reviews/{review_id}",
            data={"rating": "2", "keep_images": "[]"},
        )

    assert forbidden.status_code == 403
```

- [ ] **Step 2: Run the two new tests to verify they fail**

Run: `python -m pytest what_to_eat_today_web/backend/tests/test_reviews.py -k "keep_old_images or forbidden_for_other_user" -v`

Expected: FAIL because the `PUT` route does not exist and there is no permission guard yet.

- [ ] **Step 3: Add helpers for parsing retained images and deleting removed files**

```python
def _parse_json_list(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return [item for item in parsed if isinstance(item, str)]


def _resolve_upload_path(public_path: str) -> Path:
    filename = Path(public_path).name
    return UPLOAD_DIR / filename


def _delete_removed_images(old_images: list[str], kept_images: list[str]) -> None:
    for old in old_images:
        if old in kept_images:
            continue
        file_path = _resolve_upload_path(old)
        if file_path.exists():
            file_path.unlink()
```

- [ ] **Step 4: Implement `PUT /api/reviews/{review_id}` with author checks and image reconciliation**

```python
@router.put("/{review_id}", response_model=ReviewOut)
async def update_review(
    review_id: int,
    rating: int = Form(..., ge=1, le=5),
    content: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    keep_images: Optional[str] = Form("[]"),
    images: list[UploadFile] = File(default=[]),
    user_id: int = Depends(get_current_user_id),
):
    db = SessionLocal()
    try:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="评价不存在")
        if review.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权修改这条评价")

        existing_images = _parse_json_list(review.images)
        kept_images = _parse_json_list(keep_images)
        if any(path not in existing_images for path in kept_images):
            raise HTTPException(status_code=400, detail="保留图片列表不合法")

        new_image_paths = await _save_uploaded_images(images)
        final_images = kept_images + new_image_paths
        if len(final_images) > MAX_IMAGES:
            raise HTTPException(status_code=400, detail=f"最多上传 {MAX_IMAGES} 张图片")

        review.rating = rating
        review.content = content
        review.tags = json.dumps(_parse_json_list(tags), ensure_ascii=False)
        review.images = json.dumps(final_images)
        review.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(review)
        _delete_removed_images(existing_images, kept_images)
        return _build_review_out(review, db)
    finally:
        db.close()
```

- [ ] **Step 5: Extract the upload logic so create and update share the same validation**

```python
async def _save_uploaded_images(images: list[UploadFile]) -> list[str]:
    if len(images) > MAX_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"最多上传 {MAX_IMAGES} 张图片",
        )

    image_paths: list[str] = []
    for img in images:
        if not img.filename:
            continue
        ext = Path(img.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"不支持的图片格式: {ext}")
        content_bytes = await img.read()
        if len(content_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="单张图片大小不能超过 5MB")
        filename = f"{uuid.uuid4().hex}{ext}"
        file_path = UPLOAD_DIR / filename
        file_path.write_bytes(content_bytes)
        image_paths.append(f"/static/uploads/{filename}")
    return image_paths
```

- [ ] **Step 6: Run the full backend review suite and existing AI tests**

Run: `python -m pytest what_to_eat_today_web/backend/tests/test_reviews.py what_to_eat_today_web/backend/tests/test_ai.py -v`

Expected: PASS for both the new review tests and the pre-existing AI route tests.

- [ ] **Step 7: Commit the review editing endpoint**

```bash
git add what_to_eat_today_web/backend/routes/reviews.py what_to_eat_today_web/backend/tests/test_reviews.py
git commit -m "feat: support editing existing reviews"
```

### Task 3: Add Edit Mode to the Dish Detail Review UI

**Files:**
- Modify: `what_to_eat_today_web/frontend/src/types.ts`
- Modify: `what_to_eat_today_web/frontend/src/mock/mockApi.ts`
- Modify: `what_to_eat_today_web/frontend/src/components/ReviewForm.tsx`
- Modify: `what_to_eat_today_web/frontend/src/pages/DishDetailPage.tsx`
- Modify: `what_to_eat_today_web/frontend/src/styles.css`

- [ ] **Step 1: Extend the frontend review type and API helpers**

```ts
export interface Review {
  id: number;
  userId: number;
  dishId: string;
  dishName: string;
  dishEmoji: string;
  nickname: string;
  rating: number;
  content: string | null;
  tags: string[];
  images: string[];
  createdAt: string;
  updatedAt?: string | null;
}
```

```ts
export async function updateReview(
  reviewId: number,
  data: {
    rating: number;
    content?: string;
    tags?: string[];
    keepImages: string[];
    images?: File[];
  }
): Promise<Review> {
  const formData = new FormData();
  formData.append('rating', String(data.rating));
  if (data.content) formData.append('content', data.content);
  if (data.tags) formData.append('tags', JSON.stringify(data.tags));
  formData.append('keep_images', JSON.stringify(data.keepImages));
  for (const img of data.images ?? []) {
    formData.append('images', img);
  }

  const res = await fetch(`/api/reviews/${reviewId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '修改失败');
  }
  return res.json();
}
```

- [ ] **Step 2: Refactor `ReviewForm` props to support create and edit mode**

```ts
interface ReviewFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedDishId?: string;
  editingReview?: Review | null;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  onSuccess,
  onCancel,
  preselectedDishId,
  editingReview,
}) => {
  const isEditMode = !!editingReview;
  const [dishId, setDishId] = useState(editingReview?.dishId ?? preselectedDishId ?? '');
  const [rating, setRating] = useState(editingReview?.rating ?? 0);
  const [content, setContent] = useState(editingReview?.content ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(editingReview?.tags ?? []);
  const [existingImages, setExistingImages] = useState<string[]>(editingReview?.images ?? []);
  const [newImages, setNewImages] = useState<File[]>([]);
```

- [ ] **Step 3: Update image handling so old and new images are managed separately**

```ts
const totalImages = existingImages.length + newImages.length;

const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const remaining = 3 - totalImages;
  const toAdd = files.slice(0, remaining);

  for (const file of toAdd) {
    if (file.size > 5 * 1024 * 1024) {
      setError('单张图片不能超过 5MB');
      return;
    }
  }

  setNewImages((prev) => [...prev, ...toAdd]);
  setError('');
};

const removeExistingImage = (src: string) => {
  setExistingImages((prev) => prev.filter((item) => item !== src));
};

const removeNewImage = (index: number) => {
  setNewImages((prev) => prev.filter((_, i) => i !== index));
};
```

- [ ] **Step 4: Submit create or update based on mode**

```ts
const handleSubmit = async () => {
  if (!dishId) { setError('请选择菜品'); return; }
  if (rating === 0) { setError('请选择评分'); return; }

  setLoading(true);
  setError('');
  try {
    if (isEditMode && editingReview) {
      await updateReview(editingReview.id, {
        rating,
        content: content.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        keepImages: existingImages,
        images: newImages.length > 0 ? newImages : undefined,
      });
    } else {
      await createReview({
        dishId,
        rating,
        content: content.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        images: newImages.length > 0 ? newImages : undefined,
      });
    }
    onSuccess();
  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : (isEditMode ? '修改失败' : '提交失败'));
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 5: Detect the current user's review in `DishDetailPage` and switch the CTA**

```ts
const { isLoggedIn, user } = useAuth();
const [editingReview, setEditingReview] = useState<Review | null>(null);

useEffect(() => {
  if (!user) {
    setEditingReview(null);
    return;
  }
  const mine = reviews.find((review) => review.userId === user.id) ?? null;
  setEditingReview(mine);
}, [reviews, user]);

<button
  className="dish-detail-fab"
  onClick={() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setShowForm(true);
  }}
>
  {editingReview ? '修改评价' : '写评价'}
</button>

<ReviewForm
  onSuccess={handleReviewSuccess}
  onCancel={() => setShowForm(false)}
  preselectedDishId={id}
  editingReview={editingReview}
/>
```

- [ ] **Step 6: Show the edited marker and add the minimal styles**

```ts
{review.createdAt && (
  <span className="comment-card-time">
    {timeAgo(review.createdAt)}
    {review.updatedAt ? ' · 已编辑' : ''}
  </span>
)}
```

```css
.review-form-existing-images,
.review-form-new-images {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.review-form-image-badge {
  font-size: 12px;
  color: #9c8c78;
}

.comment-card-time {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
```

- [ ] **Step 7: Build the frontend and lint it**

Run: `npm.cmd run build`
Expected: PASS with Vite production bundle output.

Run: `npm.cmd run lint`
Expected: PASS with no ESLint errors.

- [ ] **Step 8: Commit the frontend edit flow**

```bash
git add what_to_eat_today_web/frontend/src/types.ts what_to_eat_today_web/frontend/src/mock/mockApi.ts what_to_eat_today_web/frontend/src/components/ReviewForm.tsx what_to_eat_today_web/frontend/src/pages/DishDetailPage.tsx what_to_eat_today_web/frontend/src/styles.css
git commit -m "feat: allow editing existing dish reviews"
```

### Task 4: Run End-to-End Verification and Cleanup

**Files:**
- Modify: `what_to_eat_today_web/backend/tests/test_reviews.py` (only if verification exposes a missing backend case)
- Modify: `what_to_eat_today_web/frontend/src/components/ReviewForm.tsx` (only if manual validation exposes a UI mismatch)

- [ ] **Step 1: Run the full backend test suite**

Run: `python -m pytest what_to_eat_today_web/backend/tests -v`

Expected: PASS for `test_ai.py` and `test_reviews.py`.

- [ ] **Step 2: Run the frontend production validation again**

Run: `npm.cmd run build`

Expected: PASS with generated `dist/` assets.

- [ ] **Step 3: Manually verify the review flows**

Run:

```bash
cd what_to_eat_today_web/backend
uvicorn main:app --reload --port 8000
```

In another terminal:

```bash
cd what_to_eat_today_web/frontend
npm.cmd run dev
```

Manual checklist:
- Log in as a user that has never reviewed `dish-1`, submit a first review, and confirm the detail page shows one comment.
- Refresh the same dish detail page and confirm the button now says `修改评价`.
- Open the form again and confirm score, text, tags, and existing images are prefilled.
- Remove one old image, add one new image, submit, and confirm the card still shows one review with `已编辑`.
- Try to create a duplicate review from the browser console or via `curl` against `POST /api/reviews` and confirm it returns `409`.

- [ ] **Step 4: Inspect the diff and remove accidental runtime artifacts from the change set**

Run: `git status --short`

Expected: only intended code/docs files are staged for commit; runtime SQLite files and uploaded images remain unstaged.

- [ ] **Step 5: Create the final integration commit**

```bash
git add what_to_eat_today_web/backend/models.py what_to_eat_today_web/backend/schemas.py what_to_eat_today_web/backend/routes/reviews.py what_to_eat_today_web/backend/tests/test_reviews.py what_to_eat_today_web/frontend/src/types.ts what_to_eat_today_web/frontend/src/mock/mockApi.ts what_to_eat_today_web/frontend/src/components/ReviewForm.tsx what_to_eat_today_web/frontend/src/pages/DishDetailPage.tsx what_to_eat_today_web/frontend/src/styles.css
git commit -m "feat: enforce editable single review per user"
```
