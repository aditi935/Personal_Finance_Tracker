from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker, Session
import os 
import io
import csv
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
from decimal import Decimal

load_dotenv()
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    monthly_budget: Optional[float] = 0

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    monthly_budget: float
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryCreate(BaseModel):
    name: str
    type: str
    color: Optional[str] = "#3B82F6"
    user_id: Optional[int] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    color: str
    user_id: Optional[int]
    created_at: datetime

class TransactionCreate(BaseModel):
    user_id: int
    category_id: int
    amount: float
    description: Optional[str] = None
    transaction_date: date
    type: str

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: float
    description: Optional[str]
    transaction_date: date
    type: str
    created_at: datetime

class BudgetCreate(BaseModel):
    user_id: int
    category_id: int
    amount: float
    month_year: date

class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: float
    month_year: date
    created_at: datetime

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("Finance Tracker Database Connected Successfully")
    except Exception as e:
        print("Database connection failed: ", e)

# CRUD Operations - USERS
@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text("""
                INSERT INTO users (username, email, full_name, monthly_budget) 
                VALUES (:username, :email, :full_name, :monthly_budget) 
                RETURNING *
            """),
            {
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "monthly_budget": user.monthly_budget
            }
        )
        db.commit()
        return result.mappings().first()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM users ORDER BY created_at DESC"))
    return result.mappings().all()

# CRUD Operations - CATEGORIES
@app.get("/categories/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM categories ORDER BY type, name"))
    return result.mappings().all()

@app.post("/categories/", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text("""
                INSERT INTO categories (name, type, color, user_id) 
                VALUES (:name, :type, :color, :user_id) 
                RETURNING *
            """),
            {
                "name": category.name,
                "type": category.type,
                "color": category.color,
                "user_id": category.user_id
            }
        )
        db.commit()
        return result.mappings().first()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# CRUD Operations - TRANSACTIONS
@app.post("/transactions/", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text("""
                INSERT INTO transactions (user_id, category_id, amount, description, transaction_date, type) 
                VALUES (:user_id, :category_id, :amount, :description, :transaction_date, :type) 
                RETURNING *
            """),
            {
                "user_id": transaction.user_id,
                "category_id": transaction.category_id,
                "amount": transaction.amount,
                "description": transaction.description,
                "transaction_date": transaction.transaction_date,
                "type": transaction.type
            }
        )
        db.commit()
        return result.mappings().first()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/transactions/", response_model=List[TransactionResponse])
def get_transactions(
    user_id: Optional[int] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = """
        SELECT t.*, c.name as category_name, c.color 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id
    """
    params = {}
    
    if user_id or type:
        query += " WHERE "
        conditions = []
        if user_id:
            conditions.append("t.user_id = :user_id")
            params["user_id"] = user_id
        if type:
            conditions.append("t.type = :type")
            params["type"] = type
        query += " AND ".join(conditions)
    
    query += " ORDER BY t.transaction_date DESC, t.created_at DESC"
    
    result = db.execute(text(query), params)
    return result.mappings().all()

# CRUD Operations - BUDGETS
@app.post("/budgets/", response_model=BudgetResponse)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text("""
                INSERT INTO budgets (user_id, category_id, amount, month_year) 
                VALUES (:user_id, :category_id, :amount, :month_year) 
                RETURNING *
            """),
            {
                "user_id": budget.user_id,
                "category_id": budget.category_id,
                "amount": budget.amount,
                "month_year": budget.month_year
            }
        )
        db.commit()
        return result.mappings().first()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/budgets/", response_model=List[BudgetResponse])
def get_budgets(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = "SELECT b.*, c.name as category_name FROM budgets b JOIN categories c ON b.category_id = c.id"
    params = {}
    
    if user_id:
        query += " WHERE b.user_id = :user_id"
        params["user_id"] = user_id
    
    query += " ORDER BY b.month_year DESC, b.created_at DESC"
    
    result = db.execute(text(query), params)
    return result.mappings().all()

# ANALYTICS ENDPOINTS
@app.get("/analytics/monthly-summary")
def get_monthly_summary(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = "SELECT * FROM monthly_financial_summary"
    params = {}
    
    if user_id:
        query += " WHERE user_id = :user_id"
        params["user_id"] = user_id
    
    query += " ORDER BY month_year DESC"
    
    result = db.execute(text(query), params)
    return result.mappings().all()

@app.get("/analytics/expense-summary")
def get_expense_summary(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = "SELECT * FROM monthly_expense_summary"
    params = {}
    
    if user_id:
        query += " WHERE user_id = :user_id"
        params["user_id"] = user_id
    
    query += " ORDER BY month_year DESC, total_spent DESC"
    
    result = db.execute(text(query), params)
    return result.mappings().all()

@app.get("/analytics/budget-vs-actual")
def get_budget_vs_actual(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = "SELECT * FROM budget_vs_actual"
    params = {}
    
    if user_id:
        query += " WHERE username = (SELECT username FROM users WHERE id = :user_id)"
        params["user_id"] = user_id
    
    query += " ORDER BY month_year DESC, difference DESC"
    
    result = db.execute(text(query), params)
    return result.mappings().all()

@app.get("/analytics/category-analysis")
def get_category_analysis(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = """
        SELECT 
            c.name as category_name,
            c.type,
            c.color,
            COUNT(t.id) as transaction_count,
            SUM(t.amount) as total_amount,
            AVG(t.amount) as avg_amount
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id
    """
    params = {}
    
    if user_id:
        query += " WHERE t.user_id = :user_id OR t.user_id IS NULL"
        params["user_id"] = user_id
    
    query += " GROUP BY c.id, c.name, c.type, c.color ORDER BY c.type, total_amount DESC"
    
    result = db.execute(text(query), params)
    return result.mappings().all()

# ADVANCED QUERIES ENDPOINTS
@app.get("/analytics/spending-trends")
def get_spending_trends(user_id: int, db: Session = Depends(get_db)):
    # Using GROUP BY with date functions
    result = db.execute(text("""
        SELECT 
            EXTRACT(YEAR FROM transaction_date) as year,
            EXTRACT(MONTH FROM transaction_date) as month,
            type,
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount,
            AVG(amount) as avg_amount
        FROM transactions
        WHERE user_id = :user_id
        GROUP BY year, month, type
        ORDER BY year DESC, month DESC
    """), {"user_id": user_id})
    return result.mappings().all()

@app.get("/analytics/top-categories")
def get_top_categories(user_id: int, limit: int = 5, db: Session = Depends(get_db)):
    # Using WINDOW FUNCTIONS for ranking
    result = db.execute(text("""
        SELECT 
            c.name as category_name,
            c.color,
            SUM(t.amount) as total_spent,
            COUNT(t.id) as transaction_count,
            RANK() OVER (ORDER BY SUM(t.amount) DESC) as rank
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = :user_id AND t.type = 'expense'
        GROUP BY c.id, c.name, c.color
        ORDER BY total_spent DESC
        LIMIT :limit
    """), {"user_id": user_id, "limit": limit})
    return result.mappings().all()

@app.get("/analytics/search-transactions")
def search_transactions(query: str, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    # Using LIKE for pattern matching
    sql_query = """
        SELECT t.*, c.name as category_name, c.color 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id
        WHERE t.description ILIKE :query
    """
    params = {"query": f"%{query}%"}
    
    if user_id:
        sql_query += " AND t.user_id = :user_id"
        params["user_id"] = user_id
    
    sql_query += " ORDER BY t.transaction_date DESC"
    
    result = db.execute(text(sql_query), params)
    return result.mappings().all()

# EXPORT FUNCTIONALITY
@app.get("/analytics/export-monthly-report")
def export_monthly_report(user_id: int, month_year: str, db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT 
            t.transaction_date,
            c.name as category,
            t.type,
            t.amount,
            t.description
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = :user_id 
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', TO_DATE(:month_year, 'YYYY-MM-DD'))
        ORDER BY t.transaction_date, t.type
    """), {"user_id": user_id, "month_year": month_year})
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Date', 'Category', 'Type', 'Amount', 'Description'])
    
    # Write data rows
    for row in result:
        writer.writerow([
            row.transaction_date,
            row.category,
            row.type,
            row.amount,
            row.description or ''
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=financial_report_{month_year}.csv"}
    )

# STORED PROCEDURE EXECUTION
@app.post("/analytics/generate-report")
def generate_monthly_report(user_id: int, month_year: str, db: Session = Depends(get_db)):
    try:
        # Call stored procedure
        db.execute(
            text("CALL generate_monthly_report(:user_id, TO_DATE(:month_year, 'YYYY-MM-DD'))"),
            {"user_id": user_id, "month_year": month_year}
        )
        db.commit()
        return {"message": "Monthly report generated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# DASHBOARD ENDPOINT
@app.get("/dashboard")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    # Get current month summary
    current_month = datetime.now().strftime('%Y-%m-01')
    
    # Total income and expenses for current month
    result = db.execute(text("""
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net_balance
        FROM transactions
        WHERE user_id = :user_id 
        AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', TO_DATE(:current_month, 'YYYY-MM-DD'))
    """), {"user_id": user_id, "current_month": current_month})
    
    summary = result.mappings().first()
    
    # Recent transactions
    recent_transactions = db.execute(text("""
        SELECT t.*, c.name as category_name, c.color 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = :user_id
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT 10
    """), {"user_id": user_id})
    
    # Category breakdown
    category_breakdown = db.execute(text("""
        SELECT 
            c.name as category_name,
            c.type,
            c.color,
            COUNT(t.id) as transaction_count,
            SUM(t.amount) as total_amount
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = :user_id
            AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', TO_DATE(:current_month, 'YYYY-MM-DD'))
        GROUP BY c.id, c.name, c.type, c.color
        ORDER BY c.type, total_amount DESC NULLS LAST
    """), {"user_id": user_id, "current_month": current_month})
    
    return {
        "summary": summary,
        "recent_transactions": recent_transactions.mappings().all(),
        "category_breakdown": category_breakdown.mappings().all()
    }

# Health check
@app.get("/")
def health_check():
    return {"message": "Personal Finance Tracker API is running"}

@app.get("/health")
def detailed_health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected", "timestamp": datetime.now()}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}