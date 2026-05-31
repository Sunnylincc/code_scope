import math

def square(value):
    return value * value

def hypotenuse(a, b):
    return math.sqrt(square(a) + square(b))

class Shape:
    def area(self):
        return 0
