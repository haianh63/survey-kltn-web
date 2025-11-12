import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const API_BASE = "https://news-app-backend-bl47.onrender.com";
const TOPICS = [
  "Xã hội",
  "Thế giới",
  "Kinh tế",
  "Đời sống",
  "Sức khoẻ",
  "Giáo dục",
  "Thể thao",
  "Giải trí",
  "Du lịch",
  "Pháp luật",
  "Khoa học - Công nghệ",
  "Xe",
];

// Component Loading đẹp
const LoadingScreen = ({ message = "Đang xử lý..." }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(255, 255, 255, 0.95)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      backdropFilter: "blur(5px)",
    }}
  >
    <div
      style={{
        width: 60,
        height: 60,
        border: "6px solid #f3f3f3",
        borderTop: "6px solid #1a73e8",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: 20,
      }}
    />
    <p style={{ fontSize: "18px", color: "#333", margin: 0 }}>{message}</p>
    <style jsx>{`
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </div>
);

function App() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [articles, setArticles] = useState([]);
  const [likedArticles, setLikedArticles] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(false); // Loading giữa các bước
  const [hasMore, setHasMore] = useState(true);

  const viewTimers = useRef(new Map());
  const swiperRef = useRef(null);

  // === GỬI INTERACTION ===
  const sendInteraction = async (articleId, type) => {
    try {
      await axios.post(
        `${API_BASE}/interactions`,
        { userId, articleId, interactionType: type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const sendUnlike = async (articleId) => {
    try {
      await axios.post(
        `${API_BASE}/interactions/unlike`,
        { userId, articleId, interactionType: "LIKE" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const toggleLike = (articleId) => {
    if (likedArticles.has(articleId)) {
      setLikedArticles((prev) => {
        const n = new Set(prev);
        n.delete(articleId);
        return n;
      });
      sendUnlike(articleId);
    } else {
      setLikedArticles((prev) => new Set(prev).add(articleId));
      sendInteraction(articleId, "LIKE");
    }
  };

  // === ĐO THỜI GIAN XEM ===
  const startView = (id) => viewTimers.current.set(id, Date.now());
  const endView = (id) => {
    const start = viewTimers.current.get(id);
    if (start) {
      const sec = (Date.now() - start) / 1000;
      sendInteraction(id, sec > 5 ? "VIEW" : "SKIP");
      viewTimers.current.delete(id);
    }
  };

  // === LOAD BÀI BÁO ===
  const fetchRecommendations = async (append = false) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/recommendations/${userId}?articleLimit=900`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const newArticles = res.data;
      setArticles((prev) => (append ? [...prev, ...newArticles] : newArticles));
      setHasMore(newArticles.length === 10);
      const liked = newArticles.filter((a) => a.isLiked).map((a) => a.id);
      setLikedArticles((prev) => new Set([...prev, ...liked]));
    } catch (err) {
      console.error(err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // === ĐĂNG KÝ + ĐĂNG NHẬP ===
  const registerAndLogin = async () => {
    if (!username.trim()) return;
    setLoadingStep(true);
    const email = `user${Date.now()}@test.com`;
    const pass = Math.random().toString(36).slice(2);
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username,
        email,
        password: pass,
      });
      const login = await axios.post(`${API_BASE}/auth/login`, {
        username,
        password: pass,
      });
      const { token: t, userId: id, isInitPreferences } = login.data;
      setToken(t);
      setUserId(id);
      if (isInitPreferences) {
        await fetchRecommendations();
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (err) {
      alert("Lỗi kết nối server!");
    } finally {
      setLoadingStep(false);
    }
  };

  // === GỬI SỞ THÍCH ===
  const submitPrefs = async () => {
    if (selectedTopics.length === 0) return alert("Chọn ít nhất 1 chủ đề!");
    setLoadingStep(true);
    try {
      await axios.put(
        `${API_BASE}/users/${userId}/preferences/init`,
        selectedTopics,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchRecommendations();
      setStep(3);
    } catch (err) {
      alert("Lỗi gửi sở thích!");
    } finally {
      setLoadingStep(false);
    }
  };

  // === KHI LƯỚT HẾT → LOAD THÊM ===
  const handleReachEnd = () => {
    if (!loading && hasMore) {
      fetchRecommendations(true);
    }
  };

  return (
    <div
      style={{
        fontFamily: "Segoe UI, sans-serif",
        background: "#f4f6f9",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {/* Loading toàn màn hình giữa các bước */}
      {loadingStep && (
        <LoadingScreen message="Đang chuẩn bị trải nghiệm cho bạn..." />
      )}

      {/* BƯỚC 1: NHẬP TÊN */}
      {step === 1 && (
        <div style={{ textAlign: "center", paddingTop: "100px" }}>
          <h1 style={{ fontSize: "42px", color: "#1a73e8" }}>
            Tin Tức Dành Riêng Bạn
          </h1>
          <input
            placeholder="Nhập tên của bạn..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && registerAndLogin()}
            style={{
              padding: "16px",
              width: "320px",
              fontSize: "18px",
              borderRadius: "12px",
              border: "2px solid #ddd",
              margin: "20px",
            }}
            disabled={loadingStep}
          />
          <br />
          <button
            onClick={registerAndLogin}
            disabled={!username.trim() || loadingStep}
            style={{
              padding: "16px 40px",
              fontSize: "18px",
              background: loadingStep ? "#ccc" : "#1a73e8",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: loadingStep ? "not-allowed" : "pointer",
              opacity: loadingStep ? 0.7 : 1,
            }}
          >
            {loadingStep ? "Đang xử lý..." : "Bắt Đầu Ngay"}
          </button>
        </div>
      )}

      {/* BƯỚC 2: CHỌN SỞ THÍCH */}
      {step === 2 && (
        <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
          <h2 style={{ textAlign: "center" }}>Bạn thích đọc gì?</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "15px",
              margin: "30px 0",
            }}
          >
            {TOPICS.map((t) => (
              <label
                key={t}
                style={{
                  background: selectedTopics.includes(t) ? "#1a73e8" : "#fff",
                  color: selectedTopics.includes(t) ? "white" : "#333",
                  padding: "14px",
                  borderRadius: "12px",
                  textAlign: "center",
                  cursor: loadingStep ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                  transition: "0.3s",
                  opacity: loadingStep ? 0.6 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTopics.includes(t)}
                  onChange={() =>
                    !loadingStep &&
                    setSelectedTopics((prev) =>
                      prev.includes(t)
                        ? prev.filter((x) => x !== t)
                        : [...prev, t]
                    )
                  }
                  style={{ display: "none" }}
                  disabled={loadingStep}
                />
                {t}
              </label>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={submitPrefs}
              disabled={loadingStep}
              style={{
                padding: "16px 50px",
                fontSize: "18px",
                background: loadingStep ? "#ccc" : "#34a853",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: loadingStep ? "not-allowed" : "pointer",
                opacity: loadingStep ? 0.7 : 1,
              }}
            >
              {loadingStep ? "Đang tải tin..." : "Xem Tin Gợi Ý"}
            </button>
          </div>
        </div>
      )}

      {/* BƯỚC 3: SLIDER TIN TỨC */}
      {step === 3 && (
        <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
          <h2
            style={{ textAlign: "center", margin: "20px 0", fontSize: "28px" }}
          >
            Chào <span style={{ color: "#1a73e8" }}>{username}</span>! Tin nóng
            hôm nay
          </h2>

          {articles.length === 0 && !loading ? (
            <p style={{ textAlign: "center", fontSize: "20px", color: "#666" }}>
              Đang tải tin tức...
            </p>
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: "600px",
                margin: "0 auto",
                padding: "0 16px",
                boxSizing: "border-box",
              }}
            >
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={30}
                slidesPerView={1}
                navigation
                pagination={{ clickable: true }}
                autoplay={{ delay: 8000, disableOnInteraction: false }}
                loop={false}
                onReachEnd={handleReachEnd}
                onSlideChange={() => {
                  if (swiperRef.current) {
                    const prevIndex = swiperRef.current.previousIndex;
                    if (prevIndex !== undefined) {
                      const prevArticle = articles[prevIndex];
                      if (prevArticle) endView(prevArticle.id);
                    }
                  }
                }}
                onSwiper={(swiper) => (swiperRef.current = swiper)}
                style={{ paddingBottom: "50px" }}
              >
                {articles.map((article, idx) => (
                  <SwiperSlide
                    key={article.id}
                    onMouseEnter={() => startView(article.id)}
                    onMouseLeave={() => endView(article.id)}
                  >
                    <div
                      style={{
                        background: "white",
                        borderRadius: "20px",
                        overflow: "hidden",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",

                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {article.imageLink && (
                        <img
                          src={article.imageLink}
                          alt={article.title}
                          style={{
                            width: "100%",
                            height: "45%",
                            objectFit: "cover",
                          }}
                        />
                      )}
                      <div
                        style={{
                          padding: "20px",
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: "24px",
                            margin: "0 0 15px",
                            lineHeight: "1.3",
                          }}
                        >
                          {article.title}
                        </h3>
                        <p
                          style={{
                            flex: 1,
                            color: "#444",
                            lineHeight: "1.7",
                            fontSize: "16px",
                          }}
                        >
                          {article.summary}
                        </p>
                        <div
                          style={{
                            marginTop: "15px",
                            fontSize: "14px",
                            color: "#888",
                          }}
                        >
                          <strong>{article.publisher}</strong> •{" "}
                          {new Date(article.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </div>
                        <div style={{ marginTop: "15px" }}>
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#1a73e8",
                              fontWeight: "bold",
                              textDecoration: "none",
                            }}
                          >
                            Đọc ngay →
                          </a>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(article.id);
                        }}
                        style={{
                          position: "absolute",
                          top: "20px",
                          right: "20px",
                          background: "rgba(255,255,255,0.9)",
                          border: "none",
                          borderRadius: "50%",
                          width: "50px",
                          height: "50px",
                          fontSize: "28px",
                          cursor: "pointer",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                        }}
                      >
                        {likedArticles.has(article.id) ? "❤️" : "🤍"}
                      </button>
                    </div>
                  </SwiperSlide>
                ))}

                {/* Loading khi kéo đến cuối */}
                {loading && (
                  <SwiperSlide>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "100px",
                        fontSize: "20px",
                        color: "#666",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          border: "5px solid #f3f3f3",
                          borderTop: "5px solid #1a73e8",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                          margin: "0 auto 20px",
                        }}
                      />
                      Đang tải tin mới cho bạn...
                    </div>
                  </SwiperSlide>
                )}
              </Swiper>
            </div>
          )}
        </div>
      )}

      {/* CSS cho spinner */}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
